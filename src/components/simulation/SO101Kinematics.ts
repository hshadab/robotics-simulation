/**
 * SO-101 Robot Arm Kinematics
 * Forward kinematics calculations for the LeRobot / The Robot Studio arm
 */

import type { JointState } from '../../types';

// SO-101 Kinematics (based on official URDF: so101_new_calib.urdf)
// Joint chain: base → shoulder_pan → shoulder_lift → elbow_flex → wrist_flex → wrist_roll → gripper
export const SO101_DIMS = {
  // Base dimensions
  baseHeight: 0.025,       // Base plate height
  baseRadius: 0.045,       // Base plate radius

  // Link lengths (meters) - from official URDF joint origins
  link1Height: 0.0624,     // Base to shoulder pan axis (shoulder_pan xyz z=0.0624)
  link2Length: 0.0542,     // Shoulder bracket (shoulder_lift xyz z=0.0542)
  link3Length: 0.11257,    // Upper arm (elbow_flex xyz x=0.11257)
  link4Length: 0.1349,     // Forearm (wrist_flex xyz x=0.1349)
  link5Length: 0.0611,     // Wrist (wrist_roll xyz y=0.0611)
  gripperLength: 0.098,    // Gripper to tip (gripper_frame xyz z=0.0981)

  // Joint offsets from URDF
  shoulderOffset: 0.0388,  // X offset for shoulder (shoulder_pan xyz x=0.0388)
  shoulderLiftOffset: 0.0304, // shoulder_lift xyz x offset
};

/**
 * Calculate the gripper tip position using forward kinematics
 * Based on SO-101 URDF joint chain with proper transform order
 * @param joints - Joint state with base, shoulder, elbow, wrist angles in degrees
 * @returns [x, y, z] position of the gripper tip in meters
 */
export const calculateSO101GripperPosition = (joints: JointState): [number, number, number] => {
  const dims = SO101_DIMS;

  // Convert joint angles to radians
  const shoulderPanRad = (joints.base * Math.PI) / 180;
  const shoulderLiftRad = (joints.shoulder * Math.PI) / 180;
  const elbowFlexRad = (joints.elbow * Math.PI) / 180;
  const wristFlexRad = (joints.wrist * Math.PI) / 180;

  // Start from base - shoulder pan joint is at offset and height
  const shoulderHeight = dims.baseHeight + dims.link1Height;

  // Shoulder position after shoulder_pan rotation
  const shoulderPos = {
    x: dims.shoulderOffset * Math.cos(-shoulderPanRad),
    y: shoulderHeight,
    z: dims.shoulderOffset * Math.sin(-shoulderPanRad),
  };

  // Add shoulder bracket height and offset for shoulder_lift pivot
  const shoulderLiftPos = {
    x: shoulderPos.x - dims.shoulderLiftOffset * Math.cos(-shoulderPanRad),
    y: shoulderPos.y + dims.link2Length,
    z: shoulderPos.z - dims.shoulderLiftOffset * Math.sin(-shoulderPanRad),
  };

  // Upper arm: extends from shoulder_lift at angle
  const angle1 = shoulderLiftRad;
  const elbowPos = {
    x: shoulderLiftPos.x + dims.link3Length * Math.sin(angle1) * Math.cos(-shoulderPanRad),
    y: shoulderLiftPos.y + dims.link3Length * Math.cos(angle1),
    z: shoulderLiftPos.z + dims.link3Length * Math.sin(angle1) * Math.sin(-shoulderPanRad),
  };

  // Forearm: extends from elbow at cumulative angle
  const angle2 = angle1 + elbowFlexRad;
  const wristPos = {
    x: elbowPos.x + dims.link4Length * Math.sin(angle2) * Math.cos(-shoulderPanRad),
    y: elbowPos.y + dims.link4Length * Math.cos(angle2),
    z: elbowPos.z + dims.link4Length * Math.sin(angle2) * Math.sin(-shoulderPanRad),
  };

  // Gripper: extends from wrist at cumulative angle
  const angle3 = angle2 + wristFlexRad;
  const gripperPos = {
    x: wristPos.x + (dims.link5Length + dims.gripperLength) * Math.sin(angle3) * Math.cos(-shoulderPanRad),
    y: wristPos.y + (dims.link5Length + dims.gripperLength) * Math.cos(angle3),
    z: wristPos.z + (dims.link5Length + dims.gripperLength) * Math.sin(angle3) * Math.sin(-shoulderPanRad),
  };

  return [gripperPos.x, gripperPos.y, gripperPos.z];
};
