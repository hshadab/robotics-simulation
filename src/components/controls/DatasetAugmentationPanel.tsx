/**
 * Dataset Augmentation Panel
 *
 * Provides dedicated UI for augmenting recorded episodes:
 * - Load existing episodes from recording session
 * - Configure augmentation parameters
 * - Preview augmentation effects
 * - Generate augmented dataset
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Layers,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  Clock,
  Move,
  Repeat,
  FlipHorizontal,
  Eye,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '../common';
import {
  augmentDataset,
  getAugmentationStats,
  previewAugmentation,
  type AugmentationConfig,
  DEFAULT_AUGMENTATION_CONFIG,
} from '../../lib/trajectoryAugmentation';
import type { Episode } from '../../lib/datasetExporter';

interface DatasetAugmentationPanelProps {
  episodes: Episode[];
  onAugmentedDataset?: (episodes: Episode[]) => void;
}

export const DatasetAugmentationPanel: React.FC<DatasetAugmentationPanelProps> = ({
  episodes,
  onAugmentedDataset,
}) => {
  const [expanded, setExpanded] = useState(true);

  // Augmentation config state
  const [numAugmentations, setNumAugmentations] = useState(5);
  const [actionNoiseStd, setActionNoiseStd] = useState(2.0);
  const [timeStretchMin, setTimeStretchMin] = useState(0.9);
  const [timeStretchMax, setTimeStretchMax] = useState(1.1);
  const [spatialJitter, setSpatialJitter] = useState(1.0);
  const [mirrorLeftRight, setMirrorLeftRight] = useState(false);

  // Preview state
  const [previewEpisodeIdx] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{
    original: Episode;
    augmented: Episode;
  } | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    originalCount: number;
    augmentedCount: number;
    totalCount: number;
  } | null>(null);

  // Build config object
  const config: AugmentationConfig = useMemo(
    () => ({
      numAugmentations,
      actionNoiseStd,
      timeStretchRange: [timeStretchMin, timeStretchMax],
      spatialJitter,
      mirrorLeftRight,
    }),
    [numAugmentations, actionNoiseStd, timeStretchMin, timeStretchMax, spatialJitter, mirrorLeftRight]
  );

  // Calculate stats
  const stats = useMemo(
    () => getAugmentationStats(episodes.length, config),
    [episodes.length, config]
  );

  // Generate preview
  const handleGeneratePreview = useCallback(() => {
    if (episodes.length === 0) return;

    const episode = episodes[previewEpisodeIdx % episodes.length];
    const preview = previewAugmentation(episode, config);
    setPreviewData(preview);
    setShowPreview(true);
  }, [episodes, previewEpisodeIdx, config]);

  // Run augmentation
  const handleAugment = useCallback(async () => {
    if (episodes.length === 0) return;

    setIsProcessing(true);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        const augmented = augmentDataset(episodes, config);

        setLastResult({
          originalCount: episodes.length,
          augmentedCount: augmented.length - episodes.length,
          totalCount: augmented.length,
        });

        if (onAugmentedDataset) {
          onAugmentedDataset(augmented);
        }
      } finally {
        setIsProcessing(false);
      }
    }, 50);
  }, [episodes, config, onAugmentedDataset]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setNumAugmentations(DEFAULT_AUGMENTATION_CONFIG.numAugmentations);
    setActionNoiseStd(DEFAULT_AUGMENTATION_CONFIG.actionNoiseStd);
    setTimeStretchMin(DEFAULT_AUGMENTATION_CONFIG.timeStretchRange[0]);
    setTimeStretchMax(DEFAULT_AUGMENTATION_CONFIG.timeStretchRange[1]);
    setSpatialJitter(DEFAULT_AUGMENTATION_CONFIG.spatialJitter);
    setMirrorLeftRight(DEFAULT_AUGMENTATION_CONFIG.mirrorLeftRight);
    setLastResult(null);
    setShowPreview(false);
    setPreviewData(null);
  }, []);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          Dataset Augmentation
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReset}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Episode count */}
          <div className="mb-3 p-2 bg-slate-900/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Source Episodes</span>
              <span className="text-sm font-medium text-white">{episodes.length}</span>
            </div>
            {episodes.length === 0 && (
              <div className="flex items-center gap-1 text-xs text-yellow-400 mt-1">
                <AlertCircle className="w-3 h-3" />
                Record episodes first to augment
              </div>
            )}
          </div>

          {/* Augmentation Settings */}
          <div className="space-y-3 mb-4">
            {/* Number of augmentations */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  Copies per Episode
                </span>
                <span className="text-xs text-slate-300">{numAugmentations}x</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={numAugmentations}
                onChange={(e) => setNumAugmentations(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-3
                           [&::-webkit-slider-thumb]:h-3
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-purple-500"
              />
            </div>

            {/* Action noise */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Shuffle className="w-3 h-3" />
                  Joint Noise (std)
                </span>
                <span className="text-xs text-slate-300">{actionNoiseStd.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={actionNoiseStd}
                onChange={(e) => setActionNoiseStd(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-3
                           [&::-webkit-slider-thumb]:h-3
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-purple-500"
              />
            </div>

            {/* Time stretch */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Time Stretch Range
                </span>
                <span className="text-xs text-slate-300">
                  {(timeStretchMin * 100).toFixed(0)}% - {(timeStretchMax * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="range"
                  min={0.5}
                  max={1.0}
                  step={0.05}
                  value={timeStretchMin}
                  onChange={(e) => setTimeStretchMin(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer
                             [&::-webkit-slider-thumb]:appearance-none
                             [&::-webkit-slider-thumb]:w-3
                             [&::-webkit-slider-thumb]:h-3
                             [&::-webkit-slider-thumb]:rounded-full
                             [&::-webkit-slider-thumb]:bg-purple-500"
                />
                <input
                  type="range"
                  min={1.0}
                  max={1.5}
                  step={0.05}
                  value={timeStretchMax}
                  onChange={(e) => setTimeStretchMax(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer
                             [&::-webkit-slider-thumb]:appearance-none
                             [&::-webkit-slider-thumb]:w-3
                             [&::-webkit-slider-thumb]:h-3
                             [&::-webkit-slider-thumb]:rounded-full
                             [&::-webkit-slider-thumb]:bg-purple-500"
                />
              </div>
            </div>

            {/* Spatial jitter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Move className="w-3 h-3" />
                  Spatial Jitter
                </span>
                <span className="text-xs text-slate-300">{spatialJitter.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                step={0.5}
                value={spatialJitter}
                onChange={(e) => setSpatialJitter(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-3
                           [&::-webkit-slider-thumb]:h-3
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-purple-500"
              />
            </div>

            {/* Mirror toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <FlipHorizontal className="w-3 h-3" />
                Mirror (flip base joint)
              </span>
              <button
                onClick={() => setMirrorLeftRight(!mirrorLeftRight)}
                className={`w-10 h-5 rounded-full transition-colors ${
                  mirrorLeftRight ? 'bg-purple-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
                    mirrorLeftRight ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Stats preview */}
          <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-700/30 mb-3">
            <div className="text-xs font-medium text-slate-300 mb-2">Output Preview</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-white">{stats.originalEpisodes}</div>
                <div className="text-xs text-slate-500">Original</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-400">+{stats.augmentedEpisodes}</div>
                <div className="text-xs text-slate-500">Augmented</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-400">{stats.totalEpisodes}</div>
                <div className="text-xs text-slate-500">Total</div>
              </div>
            </div>
            <div className="text-center mt-2 text-xs text-slate-400">
              {stats.multiplier.toFixed(1)}x dataset size
            </div>
          </div>

          {/* Preview button */}
          {episodes.length > 0 && (
            <div className="mb-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGeneratePreview}
                className="w-full"
              >
                <Eye className="w-3 h-3 mr-2" />
                Preview Augmentation
              </Button>
            </div>
          )}

          {/* Preview result */}
          {showPreview && previewData && (
            <div className="mb-3 p-3 bg-slate-900/30 rounded-lg border border-slate-700/30">
              <div className="text-xs font-medium text-slate-300 mb-2">Augmentation Preview</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-400 mb-1">Original</div>
                  <div className="font-mono text-slate-300">
                    {previewData.original.frames.length} frames
                  </div>
                  <div className="font-mono text-slate-300">
                    {previewData.original.metadata.duration.toFixed(2)}s
                  </div>
                </div>
                <div>
                  <div className="text-purple-400 mb-1">Augmented</div>
                  <div className="font-mono text-slate-300">
                    {previewData.augmented.frames.length} frames
                  </div>
                  <div className="font-mono text-slate-300">
                    {previewData.augmented.metadata.duration.toFixed(2)}s
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Task: {previewData.augmented.metadata.task}
              </div>
            </div>
          )}

          {/* Last result */}
          {lastResult && (
            <div className="mb-3 p-2 bg-green-500/10 rounded-lg border border-green-500/30">
              <div className="flex items-center gap-2 text-xs text-green-400">
                <CheckCircle className="w-3 h-3" />
                Generated {lastResult.totalCount} episodes ({lastResult.augmentedCount} new)
              </div>
            </div>
          )}

          {/* Action button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleAugment}
            disabled={episodes.length === 0 || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <Play className="w-3 h-3 mr-2" />
                Generate Augmented Dataset
              </>
            )}
          </Button>

          {/* Info */}
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <p className="text-xs text-slate-500">
              Augmentation adds variety to your dataset by introducing small perturbations.
              This helps trained policies generalize better.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
