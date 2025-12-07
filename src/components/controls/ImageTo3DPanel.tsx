/**
 * Image to 3D Panel
 *
 * Upload a photo of a real object and convert it to a training-ready 3D model:
 * - Drag & drop or click to upload image
 * - Configure object dimensions and physics
 * - Generate 3D model via CSM API
 * - Auto-estimate grasp points
 * - Add to scene for robot training
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Camera,
  Upload,
  Box,
  Key,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Scale,
  Sparkles,
  Download,
  Play,
} from 'lucide-react';
import { Button } from '../common';
import {
  generateTrainableObject,
  validateCSMApiKey,
  type Generated3DObject,
  type ImageTo3DRequest,
} from '../../lib/csmImageTo3D';

interface ImageTo3DPanelProps {
  onObjectGenerated?: (object: Generated3DObject) => void;
}

export const ImageTo3DPanel: React.FC<ImageTo3DPanelProps> = ({
  onObjectGenerated,
}) => {
  const [expanded, setExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API key state
  const [apiKey, setApiKey] = useState('');
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Object config
  const [objectName, setObjectName] = useState('');
  const [width, setWidth] = useState(0.1);
  const [height, setHeight] = useState(0.15);
  const [depth, setDepth] = useState(0.05);
  const [quality, setQuality] = useState<'base' | 'turbo' | 'highest'>('base');
  const [withTexture, setWithTexture] = useState(true);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ phase: '', percent: 0, message: '' });
  const [generatedObject, setGeneratedObject] = useState<Generated3DObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate API key
  const handleValidateKey = useCallback(async () => {
    if (!apiKey || apiKey.length < 10) {
      setApiKeyValid(null);
      return;
    }

    setIsValidating(true);
    const valid = await validateCSMApiKey(apiKey);
    setApiKeyValid(valid);
    setIsValidating(false);
  }, [apiKey]);

  // Handle image selection
  const handleImageSelect = useCallback((file: File) => {
    setImageFile(file);
    setError(null);
    setGeneratedObject(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Auto-set name from filename
    if (!objectName) {
      const name = file.name.replace(/.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
      setObjectName(name);
    }
  }, [objectName]);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageSelect(file);
    }
  }, [handleImageSelect]);

  // Handle file input change
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  }, [handleImageSelect]);

  // Generate 3D model
  const handleGenerate = useCallback(async () => {
    if (!imageFile || !apiKey || !apiKeyValid) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedObject(null);

    try {
      const options: Partial<ImageTo3DRequest> = {
        objectName,
        geometryModel: quality,
        textureModel: withTexture ? 'baked' : 'none',
        resolution: quality === 'highest' ? 100000 : quality === 'turbo' ? 50000 : 30000,
        scaledBbox: [width, height, depth],
        symmetry: 'auto',
      };

      const result = await generateTrainableObject(
        { apiKey },
        imageFile,
        options,
        (phase, percent, message) => {
          setProgress({ phase, percent, message });
        }
      );

      setGeneratedObject(result);
      onObjectGenerated?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [imageFile, apiKey, apiKeyValid, objectName, quality, withTexture, width, height, depth, onObjectGenerated]);

  const canGenerate = imageFile && apiKeyValid && !isGenerating;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Camera className="w-4 h-4 text-cyan-400" />
          Image to 3D
          <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            CSM
          </span>
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <>
          {/* Description */}
          <p className="text-xs text-slate-400 mb-4">
            Upload a photo of a real object to generate a training-ready 3D model with physics and grasp points.
          </p>

          {/* API Key */}
          <div className="mb-4">
            <label className="text-xs font-medium text-slate-300 mb-1 block">
              CSM API Key
            </label>
            <div className="relative">
              <Key className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onBlur={handleValidateKey}
                placeholder="csm_..."
                className="w-full pl-8 pr-8 py-2 text-sm bg-slate-900/50 border border-slate-700/50
                         rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {isValidating && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                {!isValidating && apiKeyValid === true && <CheckCircle className="w-4 h-4 text-green-400" />}
                {!isValidating && apiKeyValid === false && <AlertCircle className="w-4 h-4 text-red-400" />}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Get free API key at{' '}
              <a
                href="https://www.csm.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline"
              >
                csm.ai
              </a>
              {' '}(10 free credits)
            </p>
          </div>

          {/* Image Upload */}
          <div className="mb-4">
            <label className="text-xs font-medium text-slate-300 mb-1 block">
              Object Photo
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition
                ${imagePreview 
                  ? 'border-cyan-500/50 bg-cyan-500/5' 
                  : 'border-slate-700/50 hover:border-slate-600/50 bg-slate-900/30'
                }`}
            >
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-32 mx-auto rounded"
                  />
                  <div className="mt-2 text-xs text-slate-400">
                    Click to change image
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <div className="text-sm text-slate-400">
                    Drop image or click to upload
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    PNG, JPG up to 10MB
                  </div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Object Config */}
          {imagePreview && (
            <div className="mb-4 p-3 bg-slate-900/30 rounded-lg space-y-3">
              {/* Object Name */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Object Name</label>
                <input
                  type="text"
                  value={objectName}
                  onChange={(e) => setObjectName(e.target.value)}
                  placeholder="screwdriver"
                  className="w-full px-3 py-1.5 text-sm bg-slate-800/50 border border-slate-700/50
                           rounded text-white placeholder-slate-500"
                />
              </div>

              {/* Dimensions */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1">
                  <Scale className="w-3 h-3" />
                  Real-World Size (meters)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-xs text-slate-500">W</span>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(parseFloat(e.target.value) || 0.1)}
                      step={0.01}
                      min={0.01}
                      max={2}
                      className="w-full px-2 py-1 text-sm bg-slate-800/50 border border-slate-700/50
                               rounded text-white"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">H</span>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(parseFloat(e.target.value) || 0.1)}
                      step={0.01}
                      min={0.01}
                      max={2}
                      className="w-full px-2 py-1 text-sm bg-slate-800/50 border border-slate-700/50
                               rounded text-white"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">D</span>
                    <input
                      type="number"
                      value={depth}
                      onChange={(e) => setDepth(parseFloat(e.target.value) || 0.1)}
                      step={0.01}
                      min={0.01}
                      max={2}
                      className="w-full px-2 py-1 text-sm bg-slate-800/50 border border-slate-700/50
                               rounded text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Quality */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Quality</span>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as 'base' | 'turbo' | 'highest')}
                  className="px-2 py-1 text-sm bg-slate-800/50 border border-slate-700/50
                           rounded text-white"
                >
                  <option value="base">Base (fast)</option>
                  <option value="turbo">Turbo</option>
                  <option value="highest">Highest</option>
                </select>
              </div>

              {/* Texture toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Include Texture</span>
                <button
                  onClick={() => setWithTexture(!withTexture)}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    withTexture ? 'bg-cyan-600' : 'bg-slate-600'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
                      withTexture ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Progress */}
          {isGenerating && (
            <div className="mb-4 p-3 bg-slate-900/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">{progress.message}</span>
                <span className="text-xs text-cyan-400">{Math.round(progress.percent)}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-2 bg-red-500/10 rounded-lg border border-red-500/30">
              <div className="flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-3 h-3" />
                {error}
              </div>
            </div>
          )}

          {/* Result */}
          {generatedObject && !isGenerating && (
            <div className="mb-4 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
              <div className="flex items-center gap-2 text-sm text-green-400 mb-2">
                <CheckCircle className="w-4 h-4" />
                3D Model Ready!
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div className="flex items-center gap-1">
                  <Box className="w-3 h-3" />
                  {generatedObject.name}
                </div>
                <div className="flex items-center gap-1">
                  <Crosshair className="w-3 h-3" />
                  {generatedObject.graspPoints.length} grasp points detected
                </div>
                <div>
                  Mass: {generatedObject.physicsConfig.mass.toFixed(2)}kg
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <a
                  href={generatedObject.meshUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="secondary" size="sm" className="w-full">
                    <Download className="w-3 h-3 mr-1" />
                    Download GLB
                  </Button>
                </a>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                  onClick={() => onObjectGenerated?.(generatedObject)}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Add to Scene
                </Button>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full bg-cyan-600 hover:bg-cyan-500"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-2" />
                Generate 3D Model
              </>
            )}
          </Button>

          {/* Info */}
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <p className="text-xs text-slate-500">
              Powered by{' '}
              <a href="https://csm.ai" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                CSM.ai
              </a>
              . Photo converts to physics-ready 3D with auto grasp points for robot training.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
