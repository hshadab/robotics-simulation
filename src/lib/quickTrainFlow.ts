/**
 * Quick Train Flow Orchestration
 *
 * Manages the streamlined photo-to-training-data pipeline:
 * 1. Image → 3D object generation
 * 2. Auto-placement in workspace
 * 3. Chat-based demonstration recording
 * 4. Auto-generation of episode variations
 * 5. Export to HuggingFace
 */

import type { Episode } from './datasetExporter';
import type { Generated3DObject } from './grasp3DUtils';
import { augmentDataset, type AugmentationConfig } from './trajectoryAugmentation';
import { calculateQualityMetrics, type EpisodeQualityMetrics } from './teleoperationGuide';

// Target episode count for training
export const TARGET_EPISODE_COUNT = 50;

// Default augmentation config for quick train
export const QUICK_TRAIN_AUGMENTATION: AugmentationConfig = {
  actionNoiseStd: 2.0,
  timeStretchRange: [0.9, 1.1],
  mirrorLeftRight: true,
  spatialJitter: 1.5,
  numAugmentations: 5,
};

export type QuickTrainStep = 'upload' | 'demo' | 'generate' | 'export';

export interface QuickTrainState {
  currentStep: QuickTrainStep;
  // Step 1: Object
  object: Generated3DObject | null;
  objectName: string;
  objectPlaced: boolean;
  // Step 2: Demos
  demoEpisodes: Episode[];
  demoQuality: EpisodeQualityMetrics[];
  isRecording: boolean;
  // Step 3: Generation
  generatedEpisodes: Episode[];
  isGenerating: boolean;
  generationProgress: number;
  // Step 4: Export
  isExporting: boolean;
  exportProgress: number;
  exportedUrl: string | null;
  // Error handling
  error: string | null;
}

export const initialQuickTrainState: QuickTrainState = {
  currentStep: 'upload',
  object: null,
  objectName: '',
  objectPlaced: false,
  demoEpisodes: [],
  demoQuality: [],
  isRecording: false,
  generatedEpisodes: [],
  isGenerating: false,
  generationProgress: 0,
  isExporting: false,
  exportProgress: 0,
  exportedUrl: null,
  error: null,
};

/**
 * Calculate how many episodes we have total
 */
export function getTotalEpisodeCount(state: QuickTrainState): number {
  return state.demoEpisodes.length + state.generatedEpisodes.length;
}

/**
 * Calculate average quality score
 */
export function getAverageQuality(state: QuickTrainState): number {
  if (state.demoQuality.length === 0) return 0;
  const sum = state.demoQuality.reduce((acc, q) => acc + q.overallScore, 0);
  return Math.round(sum / state.demoQuality.length);
}

/**
 * Check if we have enough demos to proceed
 */
export function hasEnoughDemos(state: QuickTrainState): boolean {
  return state.demoEpisodes.length >= 1;
}

/**
 * Check if we're ready to export
 */
export function isReadyToExport(state: QuickTrainState): boolean {
  return getTotalEpisodeCount(state) >= 10;
}

/**
 * Auto-generate episode variations from base demos
 * Returns augmented + LLM-generated episodes to reach target count
 */
export async function autoGenerateEpisodes(
  demoEpisodes: Episode[],
  objectName: string,
  targetCount: number = TARGET_EPISODE_COUNT,
  onProgress?: (progress: number, message: string) => void
): Promise<Episode[]> {
  const allEpisodes: Episode[] = [];

  // Phase 1: Augment existing demos (5x each)
  onProgress?.(10, 'Augmenting demonstrations...');

  const augmented = augmentDataset(demoEpisodes, {
    ...QUICK_TRAIN_AUGMENTATION,
    numAugmentations: 5,
  });

  allEpisodes.push(...augmented);
  onProgress?.(30, `Created ${augmented.length} augmented episodes`);

  // Phase 2: Generate more via motion plan variations
  const remaining = targetCount - allEpisodes.length;

  if (remaining > 0) {
    onProgress?.(40, `Generating ${remaining} more variations...`);

    // Create variations by further augmenting with different seeds
    const moreAugmented = augmentDataset(demoEpisodes, {
      ...QUICK_TRAIN_AUGMENTATION,
      numAugmentations: Math.ceil(remaining / demoEpisodes.length),
      actionNoiseStd: 3.0, // Slightly more noise for diversity
      spatialJitter: 2.0,
    });

    // Take only what we need
    const additionalNeeded = Math.min(moreAugmented.length, remaining);
    allEpisodes.push(...moreAugmented.slice(0, additionalNeeded));

    onProgress?.(80, `Generated ${additionalNeeded} additional episodes`);
  }

  // Update language instructions for generated episodes
  const finalEpisodes = allEpisodes.map((ep, index) => {
    // Keep original instruction for base demos, add variation note for augmented
    const isAugmented = index >= demoEpisodes.length;
    return {
      ...ep,
      metadata: {
        ...ep.metadata,
        languageInstruction: isAugmented
          ? `${ep.metadata.languageInstruction || `Pick up the ${objectName}`} (variation ${index})`
          : ep.metadata.languageInstruction,
      },
    };
  });

  onProgress?.(100, `Ready: ${finalEpisodes.length} total episodes`);

  return finalEpisodes;
}

/**
 * Add quality metrics to an episode
 */
export function addQualityMetrics(episode: Episode): EpisodeQualityMetrics {
  const frames = episode.frames.map((f) => ({
    timestamp: f.timestamp,
    jointPositions: f.observation.jointPositions,
  }));
  return calculateQualityMetrics(frames);
}

/**
 * Get step completion status
 */
export function getStepStatus(state: QuickTrainState): {
  upload: 'pending' | 'active' | 'complete';
  demo: 'pending' | 'active' | 'complete';
  generate: 'pending' | 'active' | 'complete';
  export: 'pending' | 'active' | 'complete';
} {
  return {
    upload: state.objectPlaced ? 'complete' : state.currentStep === 'upload' ? 'active' : 'pending',
    demo: state.demoEpisodes.length >= 3
      ? 'complete'
      : state.currentStep === 'demo'
        ? 'active'
        : state.objectPlaced
          ? 'pending'
          : 'pending',
    generate: state.generatedEpisodes.length > 0
      ? 'complete'
      : state.currentStep === 'generate'
        ? 'active'
        : 'pending',
    export: state.exportedUrl
      ? 'complete'
      : state.currentStep === 'export'
        ? 'active'
        : 'pending',
  };
}

/**
 * Get suggested next action text
 */
export function getSuggestedAction(state: QuickTrainState): string {
  if (!state.objectPlaced) {
    return 'Upload a photo of your object to get started';
  }
  if (state.demoEpisodes.length === 0) {
    return `Try saying: "Pick up the ${state.objectName}"`;
  }
  if (state.demoEpisodes.length < 3) {
    return `Record ${3 - state.demoEpisodes.length} more demo(s) for better training`;
  }
  if (state.generatedEpisodes.length === 0) {
    return 'Click "Generate Training Data" to create variations';
  }
  if (!state.exportedUrl) {
    return 'Upload to HuggingFace to start training';
  }
  return 'Dataset ready! Run LeRobot training';
}

/**
 * Combine demo and generated episodes for export
 */
export function getAllEpisodes(state: QuickTrainState): Episode[] {
  return [...state.demoEpisodes, ...state.generatedEpisodes];
}

/**
 * Get training readiness score (0-100)
 */
export function getTrainingReadiness(state: QuickTrainState): {
  score: number;
  label: string;
  color: string;
} {
  const total = getTotalEpisodeCount(state);
  const quality = getAverageQuality(state);

  // Base score from episode count
  let score = Math.min(50, (total / TARGET_EPISODE_COUNT) * 50);

  // Add quality bonus (up to 30 points)
  score += (quality / 100) * 30;

  // Add diversity bonus if we have generated episodes (up to 20 points)
  if (state.generatedEpisodes.length > 0) {
    score += Math.min(20, (state.generatedEpisodes.length / 30) * 20);
  }

  score = Math.round(Math.min(100, score));

  let label: string;
  let color: string;

  if (score >= 80) {
    label = 'Excellent';
    color = '#22c55e'; // green
  } else if (score >= 60) {
    label = 'Good';
    color = '#3b82f6'; // blue
  } else if (score >= 40) {
    label = 'Acceptable';
    color = '#f59e0b'; // amber
  } else {
    label = 'Needs more data';
    color = '#ef4444'; // red
  }

  return { score, label, color };
}
