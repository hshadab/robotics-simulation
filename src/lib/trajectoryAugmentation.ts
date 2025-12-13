/**
 * Trajectory Augmentation for Dataset Diversity
 *
 * Provides tools to augment recorded robot trajectories with:
 * - Gaussian action noise (small perturbations to joint angles)
 * - Time stretching (speed variations)
 * - Spatial jitter (small position offsets to start/end)
 * - Mirroring (flip left/right for symmetric tasks)
 */

import type { Episode, Frame } from './datasetExporter';

export interface AugmentationConfig {
  // Gaussian noise added to joint angles (in degrees)
  actionNoiseStd: number;
  // Time stretch factor range [min, max], 1.0 = original speed
  timeStretchRange: [number, number];
  // Whether to generate mirrored version (base angle flipped)
  mirrorLeftRight: boolean;
  // Small random offset to add to all positions (degrees)
  spatialJitter: number;
  // Number of augmented copies per original episode
  numAugmentations: number;
}

export const DEFAULT_AUGMENTATION_CONFIG: AugmentationConfig = {
  actionNoiseStd: 2.0, // ±2 degrees of noise
  timeStretchRange: [0.9, 1.1], // 90% to 110% speed
  mirrorLeftRight: false,
  spatialJitter: 1.0, // ±1 degree offset
  numAugmentations: 5,
};

/**
 * Generate Gaussian random number using Box-Muller transform
 */
function gaussianRandom(mean = 0, std = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z * std + mean;
}

/**
 * Random number in range [min, max]
 */
function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Add Gaussian noise to joint positions
 */
function addActionNoise(positions: number[], std: number): number[] {
  return positions.map(p => p + gaussianRandom(0, std));
}

/**
 * Add spatial jitter (constant offset) to all positions in a trajectory
 * Note: Currently used implicitly through augmentFrame's spatialOffset parameter
 */
function _addSpatialJitter(positions: number[], jitter: number): number[] {
  const offsets = positions.map(() => gaussianRandom(0, jitter));
  return positions.map((p, i) => p + offsets[i]);
}

// Export for potential future use
export { _addSpatialJitter as addSpatialJitter };

/**
 * Mirror trajectory by flipping the base joint angle
 * Useful for symmetric tasks like pick-and-place
 */
function mirrorFrame(frame: Frame): Frame {
  return {
    ...frame,
    observation: {
      ...frame.observation,
      jointPositions: frame.observation.jointPositions.map((p, i) =>
        i === 0 ? -p : p // Flip base joint (index 0)
      ),
    },
    action: {
      ...frame.action,
      jointTargets: frame.action.jointTargets.map((p, i) =>
        i === 0 ? -p : p
      ),
    },
  };
}

/**
 * Time stretch a trajectory by resampling frames
 */
function timeStretchEpisode(episode: Episode, stretchFactor: number): Episode {
  const originalFrames = episode.frames;
  const originalLength = originalFrames.length;
  const newLength = Math.round(originalLength / stretchFactor);

  if (newLength < 2) {
    return episode; // Can't stretch to less than 2 frames
  }

  const newFrames: Frame[] = [];

  for (let i = 0; i < newLength; i++) {
    // Map new index to original index
    const originalIdx = (i / (newLength - 1)) * (originalLength - 1);
    const lowerIdx = Math.floor(originalIdx);
    const upperIdx = Math.min(lowerIdx + 1, originalLength - 1);
    const t = originalIdx - lowerIdx;

    const lowerFrame = originalFrames[lowerIdx];
    const upperFrame = originalFrames[upperIdx];

    // Interpolate between frames
    const interpolatedPositions = lowerFrame.observation.jointPositions.map((p, j) =>
      p + t * (upperFrame.observation.jointPositions[j] - p)
    );
    const interpolatedTargets = lowerFrame.action.jointTargets.map((p, j) =>
      p + t * (upperFrame.action.jointTargets[j] - p)
    );

    newFrames.push({
      timestamp: (i / (newLength - 1)) * (episode.metadata.duration),
      observation: {
        jointPositions: interpolatedPositions,
        endEffectorPosition: lowerFrame.observation.endEffectorPosition, // Keep from lower frame
        sensors: lowerFrame.observation.sensors,
        image: undefined, // Don't interpolate images
      },
      action: {
        jointTargets: interpolatedTargets,
        gripper: lowerFrame.action.gripper,
      },
      done: i === newLength - 1,
    });
  }

  return {
    ...episode,
    frames: newFrames,
    metadata: {
      ...episode.metadata,
      duration: episode.metadata.duration / stretchFactor,
    },
  };
}

/**
 * Augment a single frame with noise
 */
function augmentFrame(frame: Frame, config: AugmentationConfig, spatialOffset: number[]): Frame {
  const noisyPositions = addActionNoise(
    frame.observation.jointPositions.map((p, i) => p + spatialOffset[i]),
    config.actionNoiseStd
  );
  const noisyTargets = addActionNoise(
    frame.action.jointTargets.map((p, i) => p + spatialOffset[i]),
    config.actionNoiseStd
  );

  return {
    ...frame,
    observation: {
      ...frame.observation,
      jointPositions: noisyPositions,
      image: undefined, // Remove images from augmented data
    },
    action: {
      ...frame.action,
      jointTargets: noisyTargets,
    },
  };
}

/**
 * Augment a single episode
 */
export function augmentEpisode(
  episode: Episode,
  config: Partial<AugmentationConfig> = {}
): Episode {
  const fullConfig = { ...DEFAULT_AUGMENTATION_CONFIG, ...config };

  // Apply time stretching
  const stretchFactor = randomInRange(
    fullConfig.timeStretchRange[0],
    fullConfig.timeStretchRange[1]
  );
  let augmentedEpisode = timeStretchEpisode(episode, stretchFactor);

  // Generate spatial offset (constant for whole trajectory)
  const spatialOffset = episode.frames[0].observation.jointPositions.map(() =>
    gaussianRandom(0, fullConfig.spatialJitter)
  );

  // Apply noise to each frame
  augmentedEpisode = {
    ...augmentedEpisode,
    frames: augmentedEpisode.frames.map(frame =>
      augmentFrame(frame, fullConfig, spatialOffset)
    ),
    metadata: {
      ...augmentedEpisode.metadata,
      task: `${episode.metadata.task || 'task'}_augmented`,
    },
  };

  // Apply mirroring if enabled
  if (fullConfig.mirrorLeftRight && Math.random() > 0.5) {
    augmentedEpisode = {
      ...augmentedEpisode,
      frames: augmentedEpisode.frames.map(mirrorFrame),
      metadata: {
        ...augmentedEpisode.metadata,
        task: `${augmentedEpisode.metadata.task}_mirrored`,
      },
    };
  }

  return augmentedEpisode;
}

/**
 * Generate multiple augmented versions of an episode
 */
export function generateAugmentedEpisodes(
  episode: Episode,
  config: Partial<AugmentationConfig> = {}
): Episode[] {
  const fullConfig = { ...DEFAULT_AUGMENTATION_CONFIG, ...config };
  const augmented: Episode[] = [];

  for (let i = 0; i < fullConfig.numAugmentations; i++) {
    augmented.push(augmentEpisode(episode, config));
  }

  return augmented;
}

/**
 * Augment an entire dataset
 */
export function augmentDataset(
  episodes: Episode[],
  config: Partial<AugmentationConfig> = {}
): Episode[] {
  const fullConfig = { ...DEFAULT_AUGMENTATION_CONFIG, ...config };
  const allEpisodes: Episode[] = [...episodes]; // Include originals

  for (const episode of episodes) {
    const augmented = generateAugmentedEpisodes(episode, fullConfig);
    allEpisodes.push(...augmented);
  }

  return allEpisodes;
}

/**
 * Get statistics about augmentation
 */
export function getAugmentationStats(
  originalCount: number,
  config: Partial<AugmentationConfig> = {}
): {
  originalEpisodes: number;
  augmentedEpisodes: number;
  totalEpisodes: number;
  multiplier: number;
} {
  const fullConfig = { ...DEFAULT_AUGMENTATION_CONFIG, ...config };
  const augmentedCount = originalCount * fullConfig.numAugmentations;
  const totalCount = originalCount + augmentedCount;

  return {
    originalEpisodes: originalCount,
    augmentedEpisodes: augmentedCount,
    totalEpisodes: totalCount,
    multiplier: totalCount / originalCount,
  };
}

/**
 * Preview augmentation on a single episode
 * Returns original and one augmented version for comparison
 */
export function previewAugmentation(
  episode: Episode,
  config: Partial<AugmentationConfig> = {}
): { original: Episode; augmented: Episode } {
  return {
    original: episode,
    augmented: augmentEpisode(episode, config),
  };
}
