/**
 * Quick Train Panel
 *
 * Streamlined "photo to trained robot" flow:
 * 1. Upload photo → 3D object auto-placed in workspace
 * 2. Chat to demonstrate → auto-recorded with quality metrics
 * 3. Generate variations → 50 episodes from 3 demos
 * 4. One-click upload → HuggingFace with Parquet conversion
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Rocket,
  Camera,
  Upload,
  MessageSquare,
  Sparkles,
  CloudUpload,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Square,
  Loader2,
  Zap,
  BarChart3,
  AlertCircle,
  X,
  Key,
} from 'lucide-react';
import { Button } from '../common';
import { useAppStore } from '../../stores/useAppStore';
import { DatasetRecorder } from '../../lib/datasetExporter';
import {
  generateTrainableObject as generateFalObject,
  validateFalApiKey,
} from '../../lib/falImageTo3D';
import {
  getOptimalPlacement,
  getSuggestedPrompts,
} from '../../lib/workspacePlacement';
import {
  initialQuickTrainState,
  getTotalEpisodeCount,
  getAverageQuality,
  hasEnoughDemos,
  isReadyToExport,
  autoGenerateEpisodes,
  getStepStatus,
  getSuggestedAction,
  getAllEpisodes,
  getTrainingReadiness,
  TARGET_EPISODE_COUNT,
  type QuickTrainState,
} from '../../lib/quickTrainFlow';
import { exportLeRobotDataset } from '../../lib/lerobotExporter';
import { calculateQualityMetrics } from '../../lib/teleoperationGuide';

export const QuickTrainPanel: React.FC = () => {
  const [expanded, setExpanded] = useState(true);
  const [state, setState] = useState<QuickTrainState>(initialQuickTrainState);

  // API Key state (managed locally like ImageTo3DPanel)
  const [apiKey, setApiKey] = useState('');
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<DatasetRecorder | null>(null);
  const intervalRef = useRef<number | null>(null);
  const recordedFramesRef = useRef<Array<{ timestamp: number; jointPositions: number[] }>>([]);

  // Store access
  const {
    joints,
    activeRobotType,
    selectedRobotId,
    messages,
    spawnObject,
    objects,
  } = useAppStore();

  // Track last message count for auto-recording
  const lastMessageCountRef = useRef(messages.length);

  // Validate API key when it changes
  useEffect(() => {
    if (apiKey.length > 10) {
      validateFalApiKey(apiKey).then(setApiKeyValid);
    } else {
      setApiKeyValid(null);
    }
  }, [apiKey]);

  // Get current robot state for recording
  const getCurrentState = useCallback(() => {
    return joints;
  }, [joints]);

  const getJointPositions = useCallback((): number[] => {
    return [
      joints.base,
      joints.shoulder,
      joints.elbow,
      joints.wrist,
      joints.wristRoll,
      joints.gripper,
    ];
  }, [joints]);

  // ==================== STEP 1: Image Upload ====================

  const handleImageSelect = useCallback(async (file: File) => {
    if (!apiKey || !apiKeyValid) {
      setShowApiKeyInput(true);
      setState(s => ({ ...s, error: 'Please add your fal.ai API key first' }));
      return;
    }

    setState(s => ({
      ...s,
      error: null,
      currentStep: 'upload',
    }));

    try {
      // Generate 3D object
      const objectName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');

      setState(s => ({ ...s, objectName }));

      const generated = await generateFalObject(
        { apiKey },
        file,
        {
          objectName,
          outputFormat: 'glb',
          removeBackground: true,
        },
        () => {
          // Progress callback - could show progress here
        }
      );

      // Get optimal placement in workspace
      const existingPositions = objects.map(o => o.position as [number, number, number]);
      const placement = getOptimalPlacement(
        generated.dimensions,
        { avoidPositions: existingPositions }
      );

      // Add to scene
      spawnObject({
        type: 'glb',
        position: placement.position,
        rotation: placement.rotation,
        scale: 0.08,
        color: '#ffffff',
        isGrabbable: true,
        isGrabbed: false,
        isInTargetZone: false,
        modelUrl: generated.meshUrl,
        name: objectName,
      });

      setState(s => ({
        ...s,
        object: generated,
        objectPlaced: true,
        currentStep: 'demo',
      }));
    } catch (error) {
      setState(s => ({
        ...s,
        error: error instanceof Error ? error.message : 'Failed to generate 3D model',
      }));
    }
  }, [apiKey, apiKeyValid, objects, spawnObject]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  }, [handleImageSelect]);

  // ==================== STEP 2: Demo Recording ====================

  const startRecording = useCallback(() => {
    if (state.isRecording) return;

    recorderRef.current = new DatasetRecorder(activeRobotType, selectedRobotId);
    recorderRef.current.startEpisode();
    recordedFramesRef.current = [];

    setState(s => ({ ...s, isRecording: true }));

    // Record frames at 30fps
    intervalRef.current = window.setInterval(() => {
      if (recorderRef.current?.recording) {
        recorderRef.current.recordFrame(getCurrentState(), {});
        recordedFramesRef.current.push({
          timestamp: performance.now(),
          jointPositions: getJointPositions(),
        });
      }
    }, 33);
  }, [state.isRecording, activeRobotType, selectedRobotId, getCurrentState, getJointPositions]);

  const stopRecording = useCallback((success: boolean = true, instruction?: string) => {
    if (!state.isRecording || !recorderRef.current) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const taskName = state.objectName || 'pick_object';
    const langInstruction = instruction || `Pick up the ${state.objectName}`;
    const episode = recorderRef.current.endEpisode(success, taskName, langInstruction);

    // Calculate quality metrics
    const quality = calculateQualityMetrics(recordedFramesRef.current);

    setState(s => ({
      ...s,
      isRecording: false,
      demoEpisodes: [...s.demoEpisodes, episode],
      demoQuality: [...s.demoQuality, quality],
    }));
  }, [state.isRecording, state.objectName]);

  // Auto-record from chat messages
  useEffect(() => {
    if (!state.objectPlaced || state.currentStep !== 'demo') return;

    if (messages.length > lastMessageCountRef.current) {
      const newMessages = messages.slice(lastMessageCountRef.current);
      lastMessageCountRef.current = messages.length;

      for (const msg of newMessages) {
        if (msg.role === 'user' && !state.isRecording) {
          // Start recording on user message
          startRecording();
        } else if (msg.role === 'assistant' && state.isRecording) {
          // Stop recording after assistant responds
          setTimeout(() => {
            const lastUserMsg = messages.filter(m => m.role === 'user').pop();
            stopRecording(true, lastUserMsg?.content);
          }, 2000);
        }
      }
    }
  }, [messages, state.objectPlaced, state.currentStep, state.isRecording, startRecording, stopRecording]);

  // ==================== STEP 3: Auto-Generate ====================

  const handleGenerate = useCallback(async () => {
    if (state.demoEpisodes.length === 0) return;

    setState(s => ({
      ...s,
      isGenerating: true,
      generationProgress: 0,
      currentStep: 'generate',
    }));

    try {
      const generated = await autoGenerateEpisodes(
        state.demoEpisodes,
        state.objectName,
        TARGET_EPISODE_COUNT,
        (progress) => {
          setState(s => ({ ...s, generationProgress: progress }));
        }
      );

      // Remove original demos from generated (they're duplicated in augmentation)
      const newEpisodes = generated.slice(state.demoEpisodes.length);

      setState(s => ({
        ...s,
        isGenerating: false,
        generatedEpisodes: newEpisodes,
        currentStep: 'export',
      }));
    } catch (error) {
      setState(s => ({
        ...s,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to generate episodes',
      }));
    }
  }, [state.demoEpisodes, state.objectName]);

  // ==================== STEP 4: Export ====================

  const handleExport = useCallback(async () => {
    const allEpisodes = getAllEpisodes(state);
    if (allEpisodes.length === 0) return;

    setState(s => ({ ...s, isExporting: true, exportProgress: 0 }));

    try {
      // Export as ZIP
      const datasetName = `${state.objectName}_training`;
      await exportLeRobotDataset(allEpisodes, datasetName, selectedRobotId);

      setState(s => ({
        ...s,
        isExporting: false,
        exportProgress: 100,
        exportedUrl: 'downloaded',
      }));
    } catch (error) {
      setState(s => ({
        ...s,
        isExporting: false,
        error: error instanceof Error ? error.message : 'Failed to export dataset',
      }));
    }
  }, [state, selectedRobotId]);

  // ==================== UI Helpers ====================

  const stepStatus = getStepStatus(state);
  const readiness = getTrainingReadiness(state);
  const totalEpisodes = getTotalEpisodeCount(state);
  const avgQuality = getAverageQuality(state);
  const suggestedPrompts = state.objectPlaced ? getSuggestedPrompts(state.objectName) : [];

  const StepIndicator: React.FC<{ step: number; label: string; status: 'pending' | 'active' | 'complete' }> = ({
    step,
    label,
    status,
  }) => (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          status === 'complete'
            ? 'bg-green-500 text-white'
            : status === 'active'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-400'
        }`}
      >
        {status === 'complete' ? <CheckCircle className="w-4 h-4" /> : step}
      </div>
      <span className={status === 'pending' ? 'text-slate-500' : 'text-white text-sm'}>{label}</span>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl border-2 border-blue-500/30 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Rocket className="w-4 h-4 text-blue-400" />
          Quick Train
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border border-blue-500/30">
            BETA
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
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-4 px-2">
            <StepIndicator step={1} label="Object" status={stepStatus.upload} />
            <div className="flex-1 h-px bg-slate-700 mx-2" />
            <StepIndicator step={2} label="Demo" status={stepStatus.demo} />
            <div className="flex-1 h-px bg-slate-700 mx-2" />
            <StepIndicator step={3} label="Generate" status={stepStatus.generate} />
            <div className="flex-1 h-px bg-slate-700 mx-2" />
            <StepIndicator step={4} label="Export" status={stepStatus.export} />
          </div>

          {/* Error Display */}
          {state.error && (
            <div className="mb-3 p-2 bg-red-900/30 border border-red-700/50 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-300">{state.error}</p>
              </div>
              <button onClick={() => setState(s => ({ ...s, error: null }))} className="text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* API Key Input (shown when needed) */}
          {showApiKeyInput && !apiKeyValid && (
            <div className="mb-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-2 text-sm text-white mb-2">
                <Key className="w-4 h-4 text-yellow-400" />
                <span className="font-medium">fal.ai API Key Required</span>
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your fal.ai API key..."
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500"
              />
              <p className="text-xs text-slate-400 mt-2">
                Get your key at <a href="https://fal.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">fal.ai</a> - $0.07 per 3D generation
              </p>
              {apiKeyValid && (
                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> API key valid
                </p>
              )}
            </div>
          )}

          {/* Step 1: Upload Object */}
          {!state.objectPlaced && (
            <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-2 text-sm text-white mb-2">
                <Camera className="w-4 h-4 text-blue-400" />
                <span className="font-medium">Step 1: Add Your Object</span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Upload a photo of the object you want the robot to learn to pick up
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!apiKey || !apiKeyValid) {
                    setShowApiKeyInput(true);
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-500"
              >
                <Upload className="w-4 h-4 mr-2" />
                {apiKeyValid ? 'Upload Photo' : 'Add API Key First'}
              </Button>
            </div>
          )}

          {/* Step 1 Complete: Object Added */}
          {state.objectPlaced && (
            <div className="mb-3 p-2 bg-green-900/20 border border-green-700/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span>"{state.objectName}" added to scene</span>
              </div>
            </div>
          )}

          {/* Step 2: Record Demos */}
          {state.objectPlaced && state.generatedEpisodes.length === 0 && (
            <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-2 text-sm text-white mb-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span className="font-medium">Step 2: Demonstrate the Task</span>
              </div>

              {/* Suggested Prompts */}
              {suggestedPrompts.length > 0 && state.demoEpisodes.length === 0 && (
                <div className="mb-3">
                  <p className="text-xs text-slate-400 mb-2">Try saying:</p>
                  <div className="flex flex-wrap gap-1">
                    {suggestedPrompts.slice(0, 2).map((prompt, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30"
                      >
                        "{prompt}"
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recording Status */}
              {state.isRecording ? (
                <div className="p-2 bg-red-900/30 border border-red-700/50 rounded-lg mb-2">
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span>Recording demo...</span>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => stopRecording(true)}
                    className="mt-2 w-full"
                  >
                    <Square className="w-3 h-3 mr-1" />
                    Stop Recording
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                  <span className="text-sm text-slate-300">
                    {state.demoEpisodes.length} / 3 demos recorded
                  </span>
                  {state.demoEpisodes.length > 0 && avgQuality > 0 && (
                    <span className="text-xs text-slate-400">
                      Quality: {avgQuality}%
                    </span>
                  )}
                </div>
              )}

              {/* Demo Count Progress */}
              {state.demoEpisodes.length > 0 && (
                <div className="mt-2 w-full bg-slate-700/50 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-purple-500 transition-all"
                    style={{ width: `${Math.min(100, (state.demoEpisodes.length / 3) * 100)}%` }}
                  />
                </div>
              )}

              {/* Generate Button */}
              {hasEnoughDemos(state) && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={state.isGenerating}
                  className="w-full mt-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                >
                  {state.isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating... {state.generationProgress}%
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Training Data ({TARGET_EPISODE_COUNT} episodes)
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Step 3 Complete: Episodes Generated */}
          {state.generatedEpisodes.length > 0 && (
            <div className="mb-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-white">
                  <BarChart3 className="w-4 h-4 text-green-400" />
                  <span className="font-medium">{totalEpisodes} Episodes Ready</span>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${readiness.color}20`, color: readiness.color }}
                >
                  {readiness.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="p-2 bg-slate-900/50 rounded">
                  <span className="text-slate-400">Demos</span>
                  <span className="float-right text-white">{state.demoEpisodes.length}</span>
                </div>
                <div className="p-2 bg-slate-900/50 rounded">
                  <span className="text-slate-400">Generated</span>
                  <span className="float-right text-white">{state.generatedEpisodes.length}</span>
                </div>
              </div>

              {/* Export Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleExport}
                disabled={state.isExporting || !isReadyToExport(state)}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
              >
                {state.isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : state.exportedUrl ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Downloaded!
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4 mr-2" />
                    Export LeRobot Dataset
                  </>
                )}
              </Button>

              {state.exportedUrl && (
                <p className="text-xs text-green-400 mt-2 text-center">
                  Dataset exported! Run convert_to_parquet.py then train with LeRobot
                </p>
              )}
            </div>
          )}

          {/* Suggested Action */}
          <div className="p-2 bg-slate-900/30 rounded-lg">
            <p className="text-xs text-slate-400">
              <Zap className="w-3 h-3 inline mr-1 text-yellow-400" />
              {getSuggestedAction(state)}
            </p>
          </div>

          {/* Training Command (after export) */}
          {state.exportedUrl && (
            <div className="mt-3 p-2 bg-slate-800 rounded font-mono text-xs">
              <p className="text-slate-400 mb-1"># Train with LeRobot:</p>
              <p className="text-green-400">python -m lerobot.scripts.train \</p>
              <p className="text-green-400 pl-4">--dataset ./my_dataset</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuickTrainPanel;
