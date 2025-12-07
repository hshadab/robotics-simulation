/**
 * Self-collision and floor collision prevention for SO-101 robot arm
 *
 * This module implements geometric constraints to prevent the arm
 * from passing through itself or the floor. Based on the SO-101 arm geometry.
 */

import type { JointState } from '../types';

// SO-101 arm dimensions (meters) - from SO101Kinematics.ts
const SO101_DIMS = {
  baseHeight: 0.025,
  link1Height: 0.0624,
  link2Length: 0.0542,
  link3Length: 0.11257,  // Upper arm
  link4Length: 0.1349,   // Forearm
  link5Length: 0.0611,   // Wrist
  gripperLength: 0.098,
  shoulderOffset: 0.0388,
  shoulderLiftOffset: 0.0304,
};

/**
 * Calculate approximate gripper Y position for floor collision check
 */
function calculateGripperY(joints: JointState): number {
  const dims = SO101_DIMS;
  const shoulderLiftRad = (joints.shoulder * Math.PI) / 180;
  const elbowFlexRad = (joints.elbow * Math.PI) / 180;
  const wristFlexRad = (joints.wrist * Math.PI) / 180;

  // Start from shoulder pivot height
  const shoulderHeight = dims.baseHeight + dims.link1Height + dims.link2Length;

  // Upper arm contribution (cos because 0° = vertical up)
  const upperArmY = dims.link3Length * Math.cos(shoulderLiftRad);

  // Forearm contribution
  const forearmAngle = shoulderLiftRad + elbowFlexRad;
  const forearmY = dims.link4Length * Math.cos(forearmAngle);

  // Wrist/gripper contribution
  const wristAngle = forearmAngle + wristFlexRad;
  const wristY = (dims.link5Length + dims.gripperLength) * Math.cos(wristAngle);

  return shoulderHeight + upperArmY + forearmY + wristY;
}

/**
 * Calculate elbow Y position for floor collision check
 */
function calculateElbowY(joints: JointState): number {
  const dims = SO101_DIMS;
  const shoulderLiftRad = (joints.shoulder * Math.PI) / 180;

  const shoulderHeight = dims.baseHeight + dims.link1Height + dims.link2Length;
  const upperArmY = dims.link3Length * Math.cos(shoulderLiftRad);

  return shoulderHeight + upperArmY;
}

/**
 * Check if the current joint configuration would cause self-collision
 * or floor collision and return corrected values if needed.
 *
 * Key collision zones for SO-101:
 * 1. Floor collision: When arm reaches below y=0
 * 2. Elbow-to-base collision: When shoulder lifts forward and elbow folds back
 * 3. Wrist-to-shoulder collision: When arm is fully folded
 * 4. Gripper-to-arm collision: When wrist bends back into forearm
 */
export function preventSelfCollision(
  joints: JointState,
  robotId: string
): JointState {
  // Only apply to SO-101 arm
  if (robotId !== 'so-101') {
    return joints;
  }

  const corrected = { ...joints };

  // === Floor Collision Prevention ===
  // Minimum height above floor (small margin)
  const minHeight = 0.01;

  // Check and correct gripper height
  let gripperY = calculateGripperY(corrected);
  let iterations = 0;
  const maxIterations = 20;

  // If gripper is below floor, gradually reduce shoulder/elbow/wrist angles
  while (gripperY < minHeight && iterations < maxIterations) {
    // Strategy: Pull the arm up by reducing forward tilt
    if (corrected.shoulder > -90) {
      // Reduce shoulder angle (bring arm more upright)
      const adjustment = Math.min(5, corrected.shoulder + 90);
      corrected.shoulder -= adjustment;
    }
    if (corrected.elbow < 90 && corrected.elbow > -90) {
      // Adjust elbow to lift arm
      if (corrected.shoulder > 0) {
        corrected.elbow = Math.min(corrected.elbow + 3, 90);
      } else {
        corrected.elbow = Math.max(corrected.elbow - 3, -90);
      }
    }
    if (Math.abs(corrected.wrist) > 5) {
      // Reduce wrist angle toward neutral
      corrected.wrist *= 0.9;
    }

    gripperY = calculateGripperY(corrected);
    iterations++;
  }

  // Also check elbow height
  let elbowY = calculateElbowY(corrected);
  iterations = 0;
  while (elbowY < minHeight && iterations < maxIterations) {
    if (corrected.shoulder > -80) {
      corrected.shoulder -= 5;
    }
    elbowY = calculateElbowY(corrected);
    iterations++;
  }

  // === Collision Zone 1: Elbow-Base Collision ===
  // When shoulder tilts forward (positive) and elbow folds down (negative),
  // the forearm can pass through the base.
  //
  // The critical relationship: shoulder + elbow should not go too negative
  // (meaning the arm folds back on itself toward the base)

  const shoulderElbowSum = corrected.shoulder + corrected.elbow;

  // If shoulder is tilted forward (>20°), limit how much elbow can fold back
  if (corrected.shoulder > 20) {
    // The more the shoulder tilts forward, the less the elbow can fold back
    // Linear constraint: shoulder + elbow >= -30 (roughly)
    const minSum = -30;
    if (shoulderElbowSum < minSum) {
      // Correct by limiting elbow
      corrected.elbow = minSum - corrected.shoulder;
    }
  }

  // If shoulder is significantly tilted (>40°), apply stricter constraint
  if (corrected.shoulder > 40) {
    const minSum = -10;
    if (shoulderElbowSum < minSum) {
      corrected.elbow = minSum - corrected.shoulder;
    }
  }

  // If shoulder is very tilted (>60°), elbow must stay mostly extended
  if (corrected.shoulder > 60) {
    const minSum = 10;
    if (shoulderElbowSum < minSum) {
      corrected.elbow = minSum - corrected.shoulder;
    }
  }

  // === Collision Zone 2: Symmetric back collision ===
  // Same logic applies when shoulder tilts backward
  if (corrected.shoulder < -20) {
    const maxSum = 30;
    if (shoulderElbowSum > maxSum) {
      corrected.elbow = maxSum - corrected.shoulder;
    }
  }

  if (corrected.shoulder < -40) {
    const maxSum = 10;
    if (shoulderElbowSum > maxSum) {
      corrected.elbow = maxSum - corrected.shoulder;
    }
  }

  if (corrected.shoulder < -60) {
    const maxSum = -10;
    if (shoulderElbowSum > maxSum) {
      corrected.elbow = maxSum - corrected.shoulder;
    }
  }

  // === Collision Zone 3: Wrist-Forearm Collision ===
  // When wrist bends too far in the same direction as the elbow fold
  const elbowWristSum = corrected.elbow + corrected.wrist;

  // Prevent extreme wrist bend when elbow is already folded
  if (Math.abs(elbowWristSum) > 150) {
    // Limit wrist to prevent collision
    if (elbowWristSum > 150) {
      corrected.wrist = 150 - corrected.elbow;
    } else if (elbowWristSum < -150) {
      corrected.wrist = -150 - corrected.elbow;
    }
  }

  // === Ensure values stay within original limits ===
  // The collision prevention might push values outside normal ranges
  corrected.elbow = Math.max(-97, Math.min(97, corrected.elbow));
  corrected.wrist = Math.max(-95, Math.min(95, corrected.wrist));

  return corrected;
}

/**
 * Check if a specific joint change would cause collision
 * Returns true if the change is safe, false if it would cause collision
 */
export function isJointChangeSafe(
  currentJoints: JointState,
  jointName: keyof JointState,
  newValue: number,
  robotId: string
): boolean {
  if (robotId !== 'so-101') {
    return true;
  }

  const testJoints = { ...currentJoints, [jointName]: newValue };
  const corrected = preventSelfCollision(testJoints, robotId);

  // If the corrected value matches what we wanted, it's safe
  return Math.abs(corrected[jointName] - newValue) < 0.5;
}

/**
 * Get the safe range for a joint given the current configuration
 * Returns adjusted min/max values that prevent self-collision
 */
export function getSafeJointRange(
  currentJoints: JointState,
  jointName: keyof JointState,
  robotId: string,
  originalLimits: { min: number; max: number }
): { min: number; max: number } {
  if (robotId !== 'so-101') {
    return originalLimits;
  }

  let safeMin = originalLimits.min;
  let safeMax = originalLimits.max;

  // Test values across the range to find actual safe limits
  for (let testValue = originalLimits.min; testValue <= originalLimits.max; testValue += 5) {
    const testJoints = { ...currentJoints, [jointName]: testValue };
    const corrected = preventSelfCollision(testJoints, robotId);

    if (Math.abs(corrected[jointName] - testValue) < 0.5) {
      // This value is safe
      if (testValue < safeMin) safeMin = testValue;
      safeMax = testValue;
    }
  }

  return { min: safeMin, max: safeMax };
}
