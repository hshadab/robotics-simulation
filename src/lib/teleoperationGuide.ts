/**
 * Teleoperation Guide System
 *
 * Provides visual guidance and quality metrics for robot teleoperation
 * during dataset recording. Helps users create high-quality demonstrations
 * for LeRobot training.
 */

import type { JointState, SimObject, TargetZone } from '../types';

/**
 * Task template for guided teleoperation
 */
export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: 'pick_place' | 'push' | 'stack' | 'pour' | 'custom';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number; // seconds
  steps: TaskStep[];
  objects: TaskObject[];
  successCriteria: SuccessCriteria;
  languageTemplates: string[];
}

export interface TaskStep {
  id: string;
  instruction: string;
  targetPosition?: [number, number, number];
  targetJoints?: Partial<JointState>;
  tolerance: number; // degrees or meters
  visualGuide: 'arrow' | 'ghost' | 'path' | 'highlight' | 'none';
  requiredGripperState?: 'open' | 'closed' | 'any';
}

export interface TaskObject {
  type: 'cube' | 'ball' | 'cylinder';
  color: string;
  size: number;
  startPosition: [number, number, number];
  targetZone?: {
    position: [number, number, number];
    size: [number, number, number];
    color: string;
  };
}

export interface SuccessCriteria {
  objectInZone?: boolean;
  gripperClosed?: boolean;
  finalPosition?: [number, number, number];
  minFrames: number;
  maxFrames: number;
}

/**
 * Episode quality metrics
 */
export interface EpisodeQualityMetrics {
  smoothness: number; // 0-100, based on jerk minimization
  completeness: number; // 0-100, task completion percentage
  duration: number; // seconds
  frameCount: number;
  avgVelocity: number; // degrees/second
  maxVelocity: number;
  jerkScore: number; // lower is better
  pauseCount: number; // number of pauses
  collisionEvents: number;
  overallScore: number; // 0-100 weighted average
}

export type QualityLevel = 'excellent' | 'good' | 'acceptable' | 'poor';

/**
 * Pre-defined task templates for common manipulation tasks
 */
export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'pick_place_cube',
    name: 'Pick and Place Cube',
    description: 'Pick up a cube and place it on the target zone',
    category: 'pick_place',
    difficulty: 'easy',
    estimatedDuration: 15,
    steps: [
      {
        id: 'approach',
        instruction: 'Move gripper above the cube',
        targetPosition: [0.15, 0.15, 0.1],
        tolerance: 0.03,
        visualGuide: 'arrow',
        requiredGripperState: 'open',
      },
      {
        id: 'lower',
        instruction: 'Lower gripper to grab position',
        targetPosition: [0.15, 0.05, 0.1],
        tolerance: 0.02,
        visualGuide: 'ghost',
        requiredGripperState: 'open',
      },
      {
        id: 'grasp',
        instruction: 'Close gripper to grasp the cube',
        tolerance: 5,
        visualGuide: 'highlight',
        requiredGripperState: 'closed',
      },
      {
        id: 'lift',
        instruction: 'Lift the cube',
        targetPosition: [0.15, 0.2, 0.1],
        tolerance: 0.03,
        visualGuide: 'arrow',
        requiredGripperState: 'closed',
      },
      {
        id: 'move',
        instruction: 'Move to target zone',
        targetPosition: [-0.15, 0.15, 0.1],
        tolerance: 0.03,
        visualGuide: 'path',
        requiredGripperState: 'closed',
      },
      {
        id: 'place',
        instruction: 'Lower and release the cube',
        targetPosition: [-0.15, 0.05, 0.1],
        tolerance: 0.02,
        visualGuide: 'ghost',
        requiredGripperState: 'open',
      },
    ],
    objects: [
      {
        type: 'cube',
        color: '#ef4444',
        size: 0.04,
        startPosition: [0.15, 0.02, 0.1],
        targetZone: {
          position: [-0.15, 0.001, 0.1],
          size: [0.1, 0.01, 0.1],
          color: '#22c55e',
        },
      },
    ],
    successCriteria: {
      objectInZone: true,
      minFrames: 90, // ~3 seconds at 30fps
      maxFrames: 900, // ~30 seconds
    },
    languageTemplates: [
      'Pick up the red cube and place it on the green target',
      'Grab the cube and move it to the target area',
      'Transfer the red block to the green zone',
    ],
  },
  {
    id: 'stack_cubes',
    name: 'Stack Two Cubes',
    description: 'Stack a cube on top of another cube',
    category: 'stack',
    difficulty: 'medium',
    estimatedDuration: 25,
    steps: [
      {
        id: 'approach_top',
        instruction: 'Move to the top cube',
        targetPosition: [0.12, 0.15, 0.08],
        tolerance: 0.03,
        visualGuide: 'arrow',
        requiredGripperState: 'open',
      },
      {
        id: 'grasp_top',
        instruction: 'Grasp the top cube',
        tolerance: 5,
        visualGuide: 'highlight',
        requiredGripperState: 'closed',
      },
      {
        id: 'lift_top',
        instruction: 'Lift the cube',
        targetPosition: [0.12, 0.2, 0.08],
        tolerance: 0.03,
        visualGuide: 'arrow',
        requiredGripperState: 'closed',
      },
      {
        id: 'move_over_base',
        instruction: 'Move above the base cube',
        targetPosition: [-0.1, 0.2, 0.1],
        tolerance: 0.03,
        visualGuide: 'path',
        requiredGripperState: 'closed',
      },
      {
        id: 'stack',
        instruction: 'Stack on top of base cube',
        targetPosition: [-0.1, 0.08, 0.1],
        tolerance: 0.02,
        visualGuide: 'ghost',
        requiredGripperState: 'open',
      },
    ],
    objects: [
      {
        type: 'cube',
        color: '#3b82f6',
        size: 0.04,
        startPosition: [-0.1, 0.02, 0.1],
      },
      {
        type: 'cube',
        color: '#ef4444',
        size: 0.04,
        startPosition: [0.12, 0.02, 0.08],
      },
    ],
    successCriteria: {
      minFrames: 150,
      maxFrames: 1200,
    },
    languageTemplates: [
      'Stack the red cube on top of the blue cube',
      'Place the red block on the blue block',
      'Build a tower by stacking the cubes',
    ],
  },
  {
    id: 'push_to_target',
    name: 'Push to Target',
    description: 'Push an object to the target zone without grasping',
    category: 'push',
    difficulty: 'easy',
    estimatedDuration: 12,
    steps: [
      {
        id: 'position',
        instruction: 'Position gripper behind the object',
        targetPosition: [0.2, 0.05, 0.1],
        tolerance: 0.03,
        visualGuide: 'arrow',
        requiredGripperState: 'closed',
      },
      {
        id: 'push',
        instruction: 'Push object toward target',
        targetPosition: [-0.1, 0.05, 0.1],
        tolerance: 0.05,
        visualGuide: 'path',
        requiredGripperState: 'closed',
      },
    ],
    objects: [
      {
        type: 'cylinder',
        color: '#f59e0b',
        size: 0.03,
        startPosition: [0.15, 0.03, 0.1],
        targetZone: {
          position: [-0.12, 0.001, 0.1],
          size: [0.1, 0.01, 0.1],
          color: '#8b5cf6',
        },
      },
    ],
    successCriteria: {
      objectInZone: true,
      minFrames: 60,
      maxFrames: 600,
    },
    languageTemplates: [
      'Push the orange cylinder to the purple zone',
      'Slide the object to the target area',
      'Move the cylinder without picking it up',
    ],
  },
  {
    id: 'reach_positions',
    name: 'Reach Multiple Positions',
    description: 'Move the end effector through a series of waypoints',
    category: 'custom',
    difficulty: 'easy',
    estimatedDuration: 20,
    steps: [
      {
        id: 'pos1',
        instruction: 'Reach position 1 (top-left)',
        targetPosition: [-0.15, 0.2, 0.15],
        tolerance: 0.03,
        visualGuide: 'ghost',
        requiredGripperState: 'any',
      },
      {
        id: 'pos2',
        instruction: 'Reach position 2 (top-right)',
        targetPosition: [0.15, 0.2, 0.15],
        tolerance: 0.03,
        visualGuide: 'ghost',
        requiredGripperState: 'any',
      },
      {
        id: 'pos3',
        instruction: 'Reach position 3 (bottom-center)',
        targetPosition: [0, 0.1, 0.2],
        tolerance: 0.03,
        visualGuide: 'ghost',
        requiredGripperState: 'any',
      },
    ],
    objects: [],
    successCriteria: {
      minFrames: 90,
      maxFrames: 900,
    },
    languageTemplates: [
      'Move through all three waypoints',
      'Touch each highlighted position in order',
      'Navigate to all target positions',
    ],
  },
];

/**
 * Calculate episode quality metrics from recorded frames
 */
export function calculateQualityMetrics(
  frames: Array<{
    timestamp: number;
    jointPositions: number[];
  }>,
  taskTemplate?: TaskTemplate
): EpisodeQualityMetrics {
  if (frames.length < 2) {
    return {
      smoothness: 0,
      completeness: 0,
      duration: 0,
      frameCount: frames.length,
      avgVelocity: 0,
      maxVelocity: 0,
      jerkScore: 100,
      pauseCount: 0,
      collisionEvents: 0,
      overallScore: 0,
    };
  }

  // Calculate velocities and jerks
  const velocities: number[] = [];
  const jerks: number[] = [];
  let pauseCount = 0;
  const pauseThreshold = 0.5; // degrees/second

  for (let i = 1; i < frames.length; i++) {
    const dt = (frames[i].timestamp - frames[i - 1].timestamp) / 1000;
    if (dt <= 0) continue;

    // Calculate joint velocity magnitude
    let velocitySum = 0;
    for (let j = 0; j < frames[i].jointPositions.length; j++) {
      const dq = Math.abs(frames[i].jointPositions[j] - frames[i - 1].jointPositions[j]);
      velocitySum += (dq / dt) ** 2;
    }
    const velocity = Math.sqrt(velocitySum);
    velocities.push(velocity);

    if (velocity < pauseThreshold) {
      pauseCount++;
    }

    // Calculate jerk (rate of change of velocity)
    if (velocities.length >= 2) {
      const dv = Math.abs(velocities[velocities.length - 1] - velocities[velocities.length - 2]);
      jerks.push(dv / dt);
    }
  }

  const avgVelocity = velocities.length > 0
    ? velocities.reduce((a, b) => a + b, 0) / velocities.length
    : 0;
  const maxVelocity = velocities.length > 0 ? Math.max(...velocities) : 0;
  const avgJerk = jerks.length > 0
    ? jerks.reduce((a, b) => a + b, 0) / jerks.length
    : 0;

  // Normalize jerk score (lower is better, 0-100 scale inverted)
  const jerkScore = Math.min(100, avgJerk);
  const smoothness = Math.max(0, 100 - jerkScore);

  // Calculate duration
  const duration = (frames[frames.length - 1].timestamp - frames[0].timestamp) / 1000;

  // Calculate completeness (based on frame count vs expected)
  let completeness = 100;
  if (taskTemplate) {
    const expectedFrames = (taskTemplate.successCriteria.minFrames +
      taskTemplate.successCriteria.maxFrames) / 2;
    const frameRatio = frames.length / expectedFrames;
    completeness = Math.min(100, frameRatio * 100);
  }

  // Calculate overall score
  const overallScore = Math.round(
    smoothness * 0.4 +
    completeness * 0.3 +
    Math.max(0, 100 - pauseCount) * 0.2 +
    (avgVelocity > 0 ? 50 : 0) * 0.1
  );

  return {
    smoothness: Math.round(smoothness),
    completeness: Math.round(completeness),
    duration,
    frameCount: frames.length,
    avgVelocity: Math.round(avgVelocity * 10) / 10,
    maxVelocity: Math.round(maxVelocity * 10) / 10,
    jerkScore: Math.round(jerkScore),
    pauseCount,
    collisionEvents: 0, // Would need collision detection
    overallScore,
  };
}

/**
 * Get quality level from score
 */
export function getQualityLevel(score: number): QualityLevel {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'acceptable';
  return 'poor';
}

/**
 * Get quality color for UI
 */
export function getQualityColor(level: QualityLevel): string {
  switch (level) {
    case 'excellent': return '#22c55e'; // green
    case 'good': return '#3b82f6'; // blue
    case 'acceptable': return '#f59e0b'; // amber
    case 'poor': return '#ef4444'; // red
  }
}

/**
 * Generate task objects for scene
 */
export function generateTaskObjects(template: TaskTemplate): {
  objects: SimObject[];
  targetZones: TargetZone[];
} {
  const objects: SimObject[] = [];
  const targetZones: TargetZone[] = [];

  template.objects.forEach((obj, index) => {
    objects.push({
      id: `task_obj_${index}`,
      type: obj.type,
      position: obj.startPosition,
      rotation: [0, 0, 0],
      scale: obj.size,
      color: obj.color,
      isGrabbable: true,
      isGrabbed: false,
      isInTargetZone: false,
    });

    if (obj.targetZone) {
      targetZones.push({
        id: `task_zone_${index}`,
        position: obj.targetZone.position,
        size: obj.targetZone.size,
        color: obj.targetZone.color,
        acceptedObjectIds: [`task_obj_${index}`],
        isSatisfied: false,
      });
    }
  });

  return { objects, targetZones };
}

/**
 * Get random language instruction for a task
 */
export function getRandomLanguageInstruction(template: TaskTemplate): string {
  const index = Math.floor(Math.random() * template.languageTemplates.length);
  return template.languageTemplates[index];
}

/**
 * Recording guidance state
 */
export interface GuidanceState {
  taskTemplate: TaskTemplate | null;
  currentStepIndex: number;
  completedSteps: string[];
  isActive: boolean;
  startTime: number;
}

/**
 * Create initial guidance state
 */
export function createGuidanceState(template?: TaskTemplate): GuidanceState {
  return {
    taskTemplate: template || null,
    currentStepIndex: 0,
    completedSteps: [],
    isActive: false,
    startTime: 0,
  };
}

/**
 * Check if current step is complete
 */
export function isStepComplete(
  step: TaskStep,
  currentPosition: [number, number, number],
  gripperState: 'open' | 'closed'
): boolean {
  // Check gripper state if required
  if (step.requiredGripperState && step.requiredGripperState !== 'any') {
    if (gripperState !== step.requiredGripperState) {
      return false;
    }
  }

  // Check position if target specified
  if (step.targetPosition) {
    const distance = Math.sqrt(
      (currentPosition[0] - step.targetPosition[0]) ** 2 +
      (currentPosition[1] - step.targetPosition[1]) ** 2 +
      (currentPosition[2] - step.targetPosition[2]) ** 2
    );
    return distance <= step.tolerance;
  }

  return true;
}
