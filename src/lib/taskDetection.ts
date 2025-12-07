/**
 * Task Success Detection
 *
 * Automatically detects task completion based on robot state and environment.
 * Supports various task types common in robot learning.
 */

import type { JointState } from '../stores/useAppStore';

/**
 * Task type definitions
 */
export type TaskType =
  | 'reach_target'
  | 'pick_and_place'
  | 'push_object'
  | 'stack_objects'
  | 'follow_trajectory'
  | 'custom';

/**
 * Task goal configuration
 */
export interface TaskGoal {
  type: TaskType;
  name: string;
  description: string;

  // Target positions/regions
  targetPosition?: { x: number; y: number; z: number };
  targetRadius?: number; // How close to be considered "at target"

  // For pick and place
  pickZone?: { x: number; y: number; z: number; radius: number };
  placeZone?: { x: number; y: number; z: number; radius: number };

  // For trajectory following
  trajectory?: Array<{ x: number; y: number; z: number }>;
  trajectoryTolerance?: number;

  // Custom success function
  customCheck?: (state: TaskState) => boolean;

  // Timing constraints
  maxDuration?: number; // Max time in seconds
  minDuration?: number; // Min time to consider valid

  // Gripper requirements
  requireGripperClosed?: boolean;
  requireGripperOpen?: boolean;
}

/**
 * Current task state
 */
export interface TaskState {
  joints: JointState;
  endEffectorPosition: { x: number; y: number; z: number };
  gripperClosed: boolean;
  elapsedTime: number;
  objectPositions?: Array<{ id: string; x: number; y: number; z: number }>;
}

/**
 * Task evaluation result
 */
export interface TaskResult {
  success: boolean;
  progress: number; // 0-1
  reason?: string;
  metrics?: Record<string, number>;
}

/**
 * Evaluate task success based on current state and goal
 */
export function evaluateTask(state: TaskState, goal: TaskGoal): TaskResult {
  switch (goal.type) {
    case 'reach_target':
      return evaluateReachTarget(state, goal);
    case 'pick_and_place':
      return evaluatePickAndPlace(state, goal);
    case 'push_object':
      return evaluatePushObject(state, goal);
    case 'stack_objects':
      return evaluateStackObjects(state, goal);
    case 'follow_trajectory':
      return evaluateFollowTrajectory(state, goal);
    case 'custom':
      if (goal.customCheck) {
        const success = goal.customCheck(state);
        return { success, progress: success ? 1 : 0 };
      }
      return { success: false, progress: 0, reason: 'No custom check function' };
    default:
      return { success: false, progress: 0, reason: 'Unknown task type' };
  }
}

/**
 * Evaluate reach target task
 */
function evaluateReachTarget(state: TaskState, goal: TaskGoal): TaskResult {
  if (!goal.targetPosition) {
    return { success: false, progress: 0, reason: 'No target position defined' };
  }

  const distance = calculateDistance(state.endEffectorPosition, goal.targetPosition);
  const radius = goal.targetRadius || 0.05; // 5cm default
  const progress = Math.max(0, 1 - distance / (radius * 3));
  const success = distance <= radius;

  // Check gripper requirements
  if (success && goal.requireGripperClosed && !state.gripperClosed) {
    return { success: false, progress: 0.9, reason: 'Gripper must be closed' };
  }
  if (success && goal.requireGripperOpen && state.gripperClosed) {
    return { success: false, progress: 0.9, reason: 'Gripper must be open' };
  }

  return {
    success,
    progress,
    reason: success ? 'Target reached' : `Distance: ${(distance * 100).toFixed(1)}cm`,
    metrics: { distance },
  };
}

/**
 * Evaluate pick and place task
 */
function evaluatePickAndPlace(state: TaskState, goal: TaskGoal): TaskResult {
  if (!goal.pickZone || !goal.placeZone) {
    return { success: false, progress: 0, reason: 'Pick/place zones not defined' };
  }

  // Check if we're in pick zone with gripper open -> closing
  const inPickZone = isInZone(state.endEffectorPosition, goal.pickZone);
  const inPlaceZone = isInZone(state.endEffectorPosition, goal.placeZone);

  // Simple state machine progress
  // 0.25: moved to pick zone
  // 0.5: picked up (gripper closed in pick zone)
  // 0.75: moved to place zone with object
  // 1.0: placed (gripper opened in place zone)

  let progress = 0;
  let reason = 'Move to pick zone';

  if (inPickZone) {
    progress = 0.25;
    reason = 'In pick zone - close gripper';

    if (state.gripperClosed) {
      progress = 0.5;
      reason = 'Object picked - move to place zone';
    }
  }

  if (inPlaceZone && state.gripperClosed) {
    progress = 0.75;
    reason = 'In place zone - open gripper';
  }

  if (inPlaceZone && !state.gripperClosed && progress >= 0.5) {
    progress = 1.0;
    reason = 'Object placed successfully';
    return { success: true, progress: 1, reason };
  }

  return { success: false, progress, reason };
}

/**
 * Evaluate push object task
 */
function evaluatePushObject(state: TaskState, goal: TaskGoal): TaskResult {
  if (!state.objectPositions || state.objectPositions.length === 0) {
    return { success: false, progress: 0, reason: 'No objects to push' };
  }

  if (!goal.targetPosition) {
    return { success: false, progress: 0, reason: 'No target position' };
  }

  // Find closest object
  const object = state.objectPositions[0];
  const distance = calculateDistance(object, goal.targetPosition);
  const radius = goal.targetRadius || 0.05;
  const progress = Math.max(0, 1 - distance / (radius * 5));
  const success = distance <= radius;

  return {
    success,
    progress,
    reason: success ? 'Object at target' : `Object ${(distance * 100).toFixed(1)}cm from target`,
    metrics: { objectDistance: distance },
  };
}

/**
 * Evaluate stack objects task
 */
function evaluateStackObjects(state: TaskState, goal: TaskGoal): TaskResult {
  if (!state.objectPositions || state.objectPositions.length < 2) {
    return { success: false, progress: 0, reason: 'Need at least 2 objects' };
  }

  // Check if objects are stacked (one above another)
  const objects = state.objectPositions;
  const stackTolerance = 0.03; // 3cm horizontal tolerance
  const stackHeight = 0.05; // 5cm expected height difference

  let stackedPairs = 0;
  const totalPairs = objects.length - 1;

  for (let i = 1; i < objects.length; i++) {
    const lower = objects[i - 1];
    const upper = objects[i];

    const horizontalDist = Math.sqrt(
      Math.pow(upper.x - lower.x, 2) + Math.pow(upper.z - lower.z, 2)
    );
    const heightDiff = upper.y - lower.y;

    if (horizontalDist < stackTolerance && heightDiff > stackHeight * 0.5) {
      stackedPairs++;
    }
  }

  const progress = stackedPairs / totalPairs;
  const success = stackedPairs === totalPairs;

  return {
    success,
    progress,
    reason: success ? 'Objects stacked' : `${stackedPairs}/${totalPairs} pairs stacked`,
    metrics: { stackedPairs },
  };
}

/**
 * Evaluate trajectory following task
 */
function evaluateFollowTrajectory(state: TaskState, goal: TaskGoal): TaskResult {
  if (!goal.trajectory || goal.trajectory.length === 0) {
    return { success: false, progress: 0, reason: 'No trajectory defined' };
  }

  const tolerance = goal.trajectoryTolerance || 0.05;

  // Find closest point on trajectory
  let minDistance = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < goal.trajectory.length; i++) {
    const dist = calculateDistance(state.endEffectorPosition, goal.trajectory[i]);
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
    }
  }

  const progress = closestIndex / (goal.trajectory.length - 1);
  const onTrack = minDistance <= tolerance;
  const atEnd = closestIndex >= goal.trajectory.length - 1;
  const success = atEnd && onTrack;

  return {
    success,
    progress,
    reason: success
      ? 'Trajectory completed'
      : onTrack
      ? `${Math.round(progress * 100)}% complete`
      : `${(minDistance * 100).toFixed(1)}cm off trajectory`,
    metrics: { trajectoryDistance: minDistance, closestWaypoint: closestIndex },
  };
}

// Helper functions

function calculateDistance(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2)
  );
}

function isInZone(
  pos: { x: number; y: number; z: number },
  zone: { x: number; y: number; z: number; radius: number }
): boolean {
  const dist = calculateDistance(pos, zone);
  return dist <= zone.radius;
}

/**
 * Pre-defined task templates
 */
export const TASK_TEMPLATES: Record<string, TaskGoal> = {
  reach_center: {
    type: 'reach_target',
    name: 'Reach Center',
    description: 'Move gripper to the center of the workspace',
    targetPosition: { x: 0, y: 0.2, z: 0.3 },
    targetRadius: 0.05,
  },
  pick_red_cube: {
    type: 'pick_and_place',
    name: 'Pick Red Cube',
    description: 'Pick up the red cube and place it in the target zone',
    pickZone: { x: 0.2, y: 0.05, z: 0.3, radius: 0.1 },
    placeZone: { x: -0.2, y: 0.05, z: 0.3, radius: 0.1 },
  },
  push_to_target: {
    type: 'push_object',
    name: 'Push to Target',
    description: 'Push the object to the marked target area',
    targetPosition: { x: 0, y: 0.05, z: 0.4 },
    targetRadius: 0.05,
  },
  stack_cubes: {
    type: 'stack_objects',
    name: 'Stack Cubes',
    description: 'Stack the cubes on top of each other',
  },
};

/**
 * Create a custom task goal
 */
export function createTaskGoal(
  type: TaskType,
  name: string,
  config: Partial<TaskGoal>
): TaskGoal {
  return {
    type,
    name,
    description: config.description || '',
    ...config,
  };
}
