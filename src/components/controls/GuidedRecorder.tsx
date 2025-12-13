/**
 * Guided Dataset Recorder Component
 *
 * Provides an enhanced recording experience with:
 * - Task templates for common manipulation tasks
 * - Real-time quality indicators
 * - Visual step-by-step guidance
 * - Automatic language instruction generation
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Circle,
  Download,
  Trash2,
  Database,
  Video,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  Clock,
  Activity,
  BarChart3,
  Sparkles,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../common';
import { useAppStore } from '../../stores/useAppStore';
import { DatasetRecorder as Recorder, type Episode } from '../../lib/datasetExporter';
import { exportLeRobotDataset, validateForLeRobot } from '../../lib/lerobotExporter';
import { CanvasVideoRecorder } from '../../lib/videoRecorder';
import { augmentDataset, type AugmentationConfig } from '../../lib/trajectoryAugmentation';
import {
  TASK_TEMPLATES,
  type TaskTemplate,
  type EpisodeQualityMetrics,
  type GuidanceState,
  calculateQualityMetrics,
  getQualityLevel,
  getQualityColor,
  getRandomLanguageInstruction,
  createGuidanceState,
} from '../../lib/teleoperationGuide';

interface QualityIndicatorProps {
  metrics: EpisodeQualityMetrics | null;
  isRecording: boolean;
}

/**
 * Real-time quality indicator panel
 */
const QualityIndicator: React.FC<QualityIndicatorProps> = ({ metrics, isRecording }) => {
  if (!metrics && !isRecording) return null;

  const level = metrics ? getQualityLevel(metrics.overallScore) : 'poor';
  const color = getQualityColor(level);

  return (
    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-300 flex items-center gap-1">
          <Activity className="w-3 h-3" />
          Recording Quality
        </span>
        {metrics && (
          <span
            className="text-sm font-bold px-2 py-0.5 rounded"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {metrics.overallScore}%
          </span>
        )}
      </div>

      {metrics && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between p-1.5 bg-slate-800/50 rounded">
            <span className="text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Smoothness
            </span>
            <span className="text-white">{metrics.smoothness}%</span>
          </div>
          <div className="flex items-center justify-between p-1.5 bg-slate-800/50 rounded">
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Duration
            </span>
            <span className="text-white">{metrics.duration.toFixed(1)}s</span>
          </div>
          <div className="flex items-center justify-between p-1.5 bg-slate-800/50 rounded">
            <span className="text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Avg Velocity
            </span>
            <span className="text-white">{metrics.avgVelocity}°/s</span>
          </div>
          <div className="flex items-center justify-between p-1.5 bg-slate-800/50 rounded">
            <span className="text-slate-400 flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              Frames
            </span>
            <span className="text-white">{metrics.frameCount}</span>
          </div>
        </div>
      )}

      {isRecording && !metrics && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Recording... Quality will be calculated on completion
        </div>
      )}
    </div>
  );
};

interface TaskSelectorProps {
  selectedTask: TaskTemplate | null;
  onSelectTask: (task: TaskTemplate | null) => void;
  disabled: boolean;
}

/**
 * Task template selector
 */
const TaskSelector: React.FC<TaskSelectorProps> = ({ selectedTask, onSelectTask, disabled }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const tasksByCategory = useMemo(() => {
    const grouped: Record<string, TaskTemplate[]> = {};
    TASK_TEMPLATES.forEach(task => {
      if (!grouped[task.category]) {
        grouped[task.category] = [];
      }
      grouped[task.category].push(task);
    });
    return grouped;
  }, []);

  const categoryLabels: Record<string, string> = {
    pick_place: 'Pick & Place',
    push: 'Pushing',
    stack: 'Stacking',
    pour: 'Pouring',
    custom: 'Custom Tasks',
  };

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        className="w-full flex items-center justify-between p-2 bg-slate-800/70 rounded-lg
                   border border-slate-700/50 hover:border-purple-500/50 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-white">
            {selectedTask ? selectedTask.name : 'Select Task Template'}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 p-2 bg-slate-900/70 rounded-lg border border-slate-700/50 space-y-2">
          {/* Free recording option */}
          <button
            onClick={() => {
              onSelectTask(null);
              setIsExpanded(false);
            }}
            className={`w-full p-2 text-left rounded transition-colors ${
              !selectedTask
                ? 'bg-purple-600/30 border border-purple-500/50'
                : 'bg-slate-800/50 hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-white">Free Recording</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Record without guided steps - full control
            </p>
          </button>

          {/* Task templates by category */}
          {Object.entries(tasksByCategory).map(([category, tasks]) => (
            <div key={category}>
              <div className="text-xs text-slate-500 uppercase tracking-wide px-1 py-1">
                {categoryLabels[category] || category}
              </div>
              {tasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => {
                    onSelectTask(task);
                    setIsExpanded(false);
                  }}
                  className={`w-full p-2 text-left rounded transition-colors ${
                    selectedTask?.id === task.id
                      ? 'bg-purple-600/30 border border-purple-500/50'
                      : 'bg-slate-800/50 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">{task.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      task.difficulty === 'easy' ? 'bg-green-900/50 text-green-400' :
                      task.difficulty === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-red-900/50 text-red-400'
                    }`}>
                      {task.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    ~{task.estimatedDuration}s
                    <span className="mx-1">•</span>
                    {task.steps.length} steps
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface GuidanceDisplayProps {
  guidance: GuidanceState;
  onAdvanceStep: () => void;
}

/**
 * Step-by-step guidance display
 */
const GuidanceDisplay: React.FC<GuidanceDisplayProps> = ({ guidance, onAdvanceStep }) => {
  if (!guidance.taskTemplate || !guidance.isActive) return null;

  const { taskTemplate, currentStepIndex, completedSteps } = guidance;
  const currentStep = taskTemplate.steps[currentStepIndex];
  const progress = (currentStepIndex / taskTemplate.steps.length) * 100;

  return (
    <div className="p-3 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 rounded-lg border border-purple-500/30">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-purple-300 flex items-center gap-1">
          <Navigation className="w-3 h-3" />
          Guided Recording
        </span>
        <span className="text-xs text-purple-400">
          Step {currentStepIndex + 1} of {taskTemplate.steps.length}
        </span>
      </div>
      <div className="w-full bg-slate-700/50 rounded-full h-1.5 mb-3">
        <div
          className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current step instruction */}
      {currentStep && (
        <div className="bg-slate-800/60 rounded-lg p-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-white font-medium">{currentStep.instruction}</p>
              {currentStep.requiredGripperState && currentStep.requiredGripperState !== 'any' && (
                <p className="text-xs text-slate-400 mt-1">
                  Gripper: {currentStep.requiredGripperState}
                </p>
              )}
            </div>
            <button
              onClick={onAdvanceStep}
              className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 rounded text-white transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Completed steps */}
      {completedSteps.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {completedSteps.map((stepId, idx) => (
            <span
              key={stepId}
              className="px-1.5 py-0.5 text-xs bg-green-900/50 text-green-400 rounded"
            >
              ✓ Step {idx + 1}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Main Guided Dataset Recorder Panel
 */
export const GuidedRecorderPanel: React.FC = () => {
  const {
    joints,
    activeRobotType,
    selectedRobotId,
    wheeledRobot,
    drone,
    humanoid,
  } = useAppStore();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [videoBlobs, setVideoBlobs] = useState<Blob[]>([]);

  // Task and guidance state
  const [selectedTask, setSelectedTask] = useState<TaskTemplate | null>(null);
  const [guidance, setGuidance] = useState<GuidanceState>(createGuidanceState());
  const [languageInstruction, setLanguageInstruction] = useState('');

  // Quality metrics
  const [currentMetrics, setCurrentMetrics] = useState<EpisodeQualityMetrics | null>(null);
  const [episodeMetrics, setEpisodeMetrics] = useState<EpisodeQualityMetrics[]>([]);
  const recordedFramesRef = useRef<{ timestamp: number; jointPositions: number[] }[]>([]);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [datasetName, setDatasetName] = useState('robosim_dataset');
  const [recordVideo, setRecordVideo] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Augmentation state
  const [enableAugmentation, setEnableAugmentation] = useState(false);
  const [augmentationMultiplier, setAugmentationMultiplier] = useState(5);

  // Refs
  const recorderRef = useRef<Recorder | null>(null);
  const videoRecorderRef = useRef<CanvasVideoRecorder | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Get current robot state
  const getCurrentState = useCallback(() => {
    switch (activeRobotType) {
      case 'wheeled': return wheeledRobot;
      case 'drone': return drone;
      case 'humanoid': return humanoid;
      default: return joints;
    }
  }, [activeRobotType, joints, wheeledRobot, drone, humanoid]);

  // Get joint positions array for quality calculation
  const getJointPositions = useCallback((): number[] => {
    const state = getCurrentState();
    if ('base' in state) {
      return [state.base, state.shoulder, state.elbow, state.wrist, state.wristRoll, state.gripper];
    }
    return [];
  }, [getCurrentState]);

  // Handle task selection
  const handleSelectTask = useCallback((task: TaskTemplate | null) => {
    setSelectedTask(task);
    if (task) {
      setLanguageInstruction(getRandomLanguageInstruction(task));
      // Set up scene for the task
      // Note: In a full implementation, we'd call spawnObject for each task object
    } else {
      setLanguageInstruction('');
    }
    setGuidance(createGuidanceState(task || undefined));
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    recorderRef.current = new Recorder(activeRobotType, selectedRobotId);
    recorderRef.current.startEpisode();
    recordedFramesRef.current = [];

    if (recordVideo) {
      videoRecorderRef.current = new CanvasVideoRecorder({ fps: 30 });
      const canvas = videoRecorderRef.current.findThreeCanvas();
      if (canvas) {
        videoRecorderRef.current.start();
      }
    }

    setIsRecording(true);
    setFrameCount(0);
    setCurrentMetrics(null);

    // Activate guidance if task selected
    if (selectedTask) {
      setGuidance(prev => ({
        ...prev,
        isActive: true,
        startTime: Date.now(),
      }));
    }

    // Record frames at 30 FPS
    intervalRef.current = window.setInterval(() => {
      if (recorderRef.current?.recording) {
        const imageDataUrl = recordVideo ? videoRecorderRef.current?.captureFrame() : undefined;
        recorderRef.current.recordFrame(getCurrentState(), {}, imageDataUrl || undefined);
        setFrameCount(recorderRef.current.frameCount);

        // Track frames for quality calculation
        recordedFramesRef.current.push({
          timestamp: performance.now(),
          jointPositions: getJointPositions(),
        });

        // Update quality metrics every second
        if (recordedFramesRef.current.length % 30 === 0) {
          const metrics = calculateQualityMetrics(recordedFramesRef.current, selectedTask || undefined);
          setCurrentMetrics(metrics);
        }
      }
    }, 33);
  }, [activeRobotType, selectedRobotId, recordVideo, getCurrentState, getJointPositions, selectedTask]);

  // Stop recording
  const stopRecording = useCallback(async (success = true) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    let videoBlob: Blob | null = null;
    if (videoRecorderRef.current?.recording) {
      videoBlob = await videoRecorderRef.current.stop();
    }

    if (recorderRef.current) {
      const taskName = selectedTask?.id || 'manipulation_task';
      const episode = recorderRef.current.endEpisode(success, taskName, languageInstruction || undefined);
      setEpisodes(prev => [...prev, episode]);

      // Calculate final quality metrics
      const finalMetrics = calculateQualityMetrics(recordedFramesRef.current, selectedTask || undefined);
      setCurrentMetrics(finalMetrics);
      setEpisodeMetrics(prev => [...prev, finalMetrics]);

      if (videoBlob) {
        setVideoBlobs(prev => [...prev, videoBlob!]);
      }
    }

    setIsRecording(false);
    setGuidance(prev => ({ ...prev, isActive: false }));
  }, [selectedTask, languageInstruction]);

  // Advance to next step in guided mode
  const advanceStep = useCallback(() => {
    setGuidance(prev => {
      if (!prev.taskTemplate) return prev;
      const currentStep = prev.taskTemplate.steps[prev.currentStepIndex];
      const newCompletedSteps = [...prev.completedSteps, currentStep.id];
      const newStepIndex = Math.min(prev.currentStepIndex + 1, prev.taskTemplate.steps.length - 1);

      return {
        ...prev,
        currentStepIndex: newStepIndex,
        completedSteps: newCompletedSteps,
      };
    });
  }, []);

  // Clear all episodes
  const clearEpisodes = useCallback(() => {
    setEpisodes([]);
    setVideoBlobs([]);
    setEpisodeMetrics([]);
    setCurrentMetrics(null);
  }, []);

  // Export dataset
  const exportDataset = useCallback(async () => {
    if (episodes.length === 0) return;

    setIsExporting(true);
    try {
      let episodesToExport = episodes;
      if (enableAugmentation) {
        const augConfig: Partial<AugmentationConfig> = {
          actionNoiseStd: 2.0,
          numAugmentations: augmentationMultiplier,
          timeStretchRange: [0.9, 1.1],
          spatialJitter: 1.0,
        };
        episodesToExport = augmentDataset(episodes, augConfig);
      }

      const validation = validateForLeRobot(episodes);
      if (!validation.valid) {
        alert(`Cannot export: ${validation.errors.join(', ')}`);
        setIsExporting(false);
        return;
      }

      await exportLeRobotDataset(
        episodesToExport,
        datasetName,
        selectedRobotId,
        30,
        enableAugmentation ? undefined : (recordVideo ? videoBlobs : undefined)
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Check console for details.');
    }
    setIsExporting(false);
  }, [episodes, enableAugmentation, augmentationMultiplier, datasetName, selectedRobotId, recordVideo, videoBlobs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Calculate totals
  const totalFrames = episodes.reduce((sum, ep) => sum + ep.frames.length, 0);
  const totalDuration = episodes.reduce((sum, ep) => sum + ep.metadata.duration, 0) / 1000;
  const avgQuality = episodeMetrics.length > 0
    ? Math.round(episodeMetrics.reduce((sum, m) => sum + m.overallScore, 0) / episodeMetrics.length)
    : 0;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-400" />
          Guided Dataset Recorder
        </h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Task Selector */}
      <TaskSelector
        selectedTask={selectedTask}
        onSelectTask={handleSelectTask}
        disabled={isRecording}
      />

      {/* Language Instruction */}
      {selectedTask && (
        <div className="mb-3">
          <label className="text-xs text-slate-400 block mb-1">
            Language Instruction
            <button
              onClick={() => setLanguageInstruction(getRandomLanguageInstruction(selectedTask))}
              className="ml-2 text-purple-400 hover:text-purple-300"
              title="Generate new instruction"
            >
              <RefreshCw className="w-3 h-3 inline" />
            </button>
          </label>
          <textarea
            value={languageInstruction}
            onChange={(e) => setLanguageInstruction(e.target.value)}
            className="w-full px-2 py-1 text-sm bg-slate-900/50 border border-slate-700 rounded text-white resize-none"
            placeholder="Enter task instruction..."
            rows={2}
            disabled={isRecording}
          />
        </div>
      )}

      {/* Guidance Display */}
      {guidance.isActive && (
        <div className="mb-3">
          <GuidanceDisplay guidance={guidance} onAdvanceStep={advanceStep} />
        </div>
      )}

      {/* Quality Indicator */}
      <div className="mb-3">
        <QualityIndicator metrics={currentMetrics} isRecording={isRecording} />
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-3 bg-slate-900/50 rounded-lg space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Dataset Name</label>
            <input
              type="text"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded text-white"
              placeholder="my_dataset"
              disabled={isRecording}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Video className="w-3 h-3" />
              Record Video
            </span>
            <button
              onClick={() => setRecordVideo(!recordVideo)}
              disabled={isRecording}
              className={`w-10 h-5 rounded-full transition-colors ${
                recordVideo ? 'bg-purple-600' : 'bg-slate-600'
              } disabled:opacity-50`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  recordVideo ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Data Augmentation
            </span>
            <button
              onClick={() => setEnableAugmentation(!enableAugmentation)}
              disabled={isRecording}
              className={`w-10 h-5 rounded-full transition-colors ${
                enableAugmentation ? 'bg-green-600' : 'bg-slate-600'
              } disabled:opacity-50`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  enableAugmentation ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {enableAugmentation && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 w-20">Multiplier:</label>
              <select
                value={augmentationMultiplier}
                onChange={(e) => setAugmentationMultiplier(Number(e.target.value))}
                className="flex-1 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-white"
                disabled={isRecording}
              >
                <option value={2}>2x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex items-center gap-2 mb-3">
        {!isRecording ? (
          <Button
            variant="primary"
            size="sm"
            onClick={startRecording}
            leftIcon={<Circle className="w-3 h-3 fill-current" />}
            className="flex-1"
          >
            {selectedTask ? 'Start Guided Recording' : 'Start Recording'}
          </Button>
        ) : (
          <>
            <Button
              variant="success"
              size="sm"
              onClick={() => stopRecording(true)}
              leftIcon={<CheckCircle className="w-4 h-4" />}
              className="flex-1"
            >
              Success
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => stopRecording(false)}
              leftIcon={<XCircle className="w-4 h-4" />}
              className="flex-1"
            >
              Fail
            </Button>
          </>
        )}
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="mb-3 p-2 bg-red-900/30 border border-red-700/50 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="font-medium">Recording</span>
            <span className="text-red-300">
              {frameCount} frames ({(frameCount / 30).toFixed(1)}s)
            </span>
          </div>
        </div>
      )}

      {/* Episodes List */}
      {episodes.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
            <span>
              {episodes.length} episode{episodes.length !== 1 ? 's' : ''} • {totalFrames} frames
              • {totalDuration.toFixed(1)}s
            </span>
            {avgQuality > 0 && (
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: `${getQualityColor(getQualityLevel(avgQuality))}20`,
                  color: getQualityColor(getQualityLevel(avgQuality)),
                }}
              >
                Avg Quality: {avgQuality}%
              </span>
            )}
          </div>

          <div className="max-h-24 overflow-y-auto space-y-1">
            {episodes.map((ep, idx) => {
              const metrics = episodeMetrics[idx];
              const qualityLevel = metrics ? getQualityLevel(metrics.overallScore) : null;

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs px-2 py-1 bg-slate-900/50 rounded"
                >
                  <span className="text-slate-300">Episode {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{ep.frames.length} frames</span>
                    {metrics && (
                      <span
                        className="px-1.5 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor: `${getQualityColor(qualityLevel!)}20`,
                          color: getQualityColor(qualityLevel!),
                        }}
                      >
                        {metrics.overallScore}%
                      </span>
                    )}
                    {ep.metadata.success ? (
                      <CheckCircle className="w-3 h-3 text-green-400" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Export Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={exportDataset}
          disabled={episodes.length === 0 || isExporting || isRecording}
          leftIcon={<Download className="w-4 h-4" />}
          className="flex-1"
        >
          {isExporting ? 'Exporting...' : 'Export LeRobot'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={clearEpisodes}
          disabled={episodes.length === 0 || isRecording}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Tips for high-quality recordings */}
      {!isRecording && episodes.length === 0 && (
        <div className="mt-3 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-xs text-blue-300">
          <p className="font-medium mb-1">Tips for high-quality demonstrations:</p>
          <ul className="list-disc list-inside text-blue-400/80 space-y-0.5">
            <li>Move smoothly - avoid jerky motions</li>
            <li>Complete the full task in each episode</li>
            <li>Record 10-50 episodes for good training</li>
            <li>Use varied starting positions</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default GuidedRecorderPanel;
