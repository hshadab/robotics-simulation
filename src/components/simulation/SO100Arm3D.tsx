/**
 * SO-101 Robot Arm 3D Model
 * SYSTEMATIC APPROACH: Uses exact transforms from official URDF
 * Source: https://github.com/TheRobotStudio/SO-ARM100/blob/main/Simulation/SO101/so101_new_calib.urdf
 *
 * URDF Coordinate System: Z-up
 * Three.js Coordinate System: Y-up
 * Conversion: URDF (x,y,z) → Three.js (x,z,-y) for positions
 *             URDF rpy applied directly then rotate -90° around X
 */

import React, { useMemo, Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import type { JointState } from '../../types';

interface SO100ArmProps {
  joints: JointState;
}

const STL_PATH = '/models/so101';

// Materials matching URDF
const MAT = {
  printed: { color: '#F5F0E6', metalness: 0.0, roughness: 0.4 },  // 3d_printed
  servo: { color: '#1a1a1a', metalness: 0.2, roughness: 0.3 },    // sts3215
};

/**
 * URDF Visual Origin Data - extracted directly from so101_new_calib.urdf
 * Format: { xyz: [x, y, z], rpy: [roll, pitch, yaw] }
 */
const URDF_VISUALS = {
  // base_link visuals
  base_motor_holder: { xyz: [-0.00636471, -9.94414e-05, -0.0024], rpy: [1.5708, 0, 1.5708] },
  base: { xyz: [-0.00636471, 0, -0.0024], rpy: [1.5708, 0, 1.5708] },
  base_servo: { xyz: [0.0263353, 0, 0.0437], rpy: [0, 0, 0] },

  // shoulder_link visuals
  shoulder_servo: { xyz: [-0.0303992, 0.000422241, -0.0417], rpy: [1.5708, 1.5708, 0] },
  motor_holder_base: { xyz: [-0.0675992, -0.000177759, 0.0158499], rpy: [1.5708, -1.5708, 0] },
  rotation_pitch: { xyz: [0.0122008, 2.22413e-05, 0.0464], rpy: [-1.5708, 0, 0] },

  // upper_arm_link visuals
  upper_arm_servo: { xyz: [-0.11257, -0.0155, 0.0187], rpy: [-Math.PI, 0, -1.5708] },
  upper_arm: { xyz: [-0.065085, 0.012, 0.0182], rpy: [Math.PI, 0, 0] },

  // lower_arm_link visuals
  under_arm: { xyz: [-0.0648499, -0.032, 0.0182], rpy: [Math.PI, 0, 0] },
  motor_holder_wrist: { xyz: [-0.0648499, -0.032, 0.018], rpy: [-Math.PI, 0, 0] },
  lower_arm_servo: { xyz: [-0.1224, 0.0052, 0.0187], rpy: [-Math.PI, 0, -Math.PI] },

  // wrist_link visuals
  wrist_servo: { xyz: [0, -0.0424, 0.0306], rpy: [1.5708, 1.5708, 0] },
  wrist_roll_pitch: { xyz: [0, -0.028, 0.0181], rpy: [-1.5708, -1.5708, 0] },

  // gripper_link visuals
  gripper_servo: { xyz: [0.0077, 0.0001, -0.0234], rpy: [-1.5708, 0, 0] },
  wrist_roll_follower: { xyz: [0, -0.000218214, 0.000949706], rpy: [-Math.PI, 0, 0] },

  // moving_jaw_link visuals
  moving_jaw: { xyz: [0, 0, 0.0189], rpy: [0, 0, 0] },
};

/**
 * URDF Joint Origins - transforms from parent to child link
 */
const URDF_JOINTS = {
  // base_link → shoulder_link
  shoulder_pan: { xyz: [0.0388353, 0, 0.0624], rpy: [Math.PI, 0, -Math.PI] },
  // shoulder_link → upper_arm_link
  shoulder_lift: { xyz: [-0.0303992, -0.0182778, -0.0542], rpy: [-1.5708, -1.5708, 0] },
  // upper_arm_link → lower_arm_link
  elbow_flex: { xyz: [-0.11257, -0.028, 0], rpy: [0, 0, 1.5708] },
  // lower_arm_link → wrist_link
  wrist_flex: { xyz: [-0.1349, 0.0052, 0], rpy: [0, 0, -1.5708] },
  // wrist_link → gripper_link
  wrist_roll: { xyz: [0, -0.0611, 0.0181], rpy: [1.5708, 0.0486795, Math.PI] },
  // gripper_link → moving_jaw
  gripper: { xyz: [0.0202, 0.0188, -0.0234], rpy: [1.5708, 0, 0] },
};

/**
 * Convert URDF coordinates (Z-up) to Three.js (Y-up)
 * URDF: X-forward, Y-left, Z-up
 * Three.js: X-right, Y-up, Z-forward
 */
function urdfToThreePos(xyz: number[]): [number, number, number] {
  return [xyz[0], xyz[2], -xyz[1]];
}

/**
 * Convert URDF RPY to Three.js Euler
 * Apply the rotation in URDF frame, then account for coordinate change
 */
function urdfToThreeRot(rpy: number[]): THREE.Euler {
  // Create rotation matrix from URDF RPY (roll around X, pitch around Y, yaw around Z)
  const euler = new THREE.Euler(rpy[0], rpy[1], rpy[2], 'XYZ');
  const matrix = new THREE.Matrix4().makeRotationFromEuler(euler);

  // Apply coordinate transform: rotate -90 degrees around X to go from Z-up to Y-up
  const coordTransform = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  matrix.premultiply(coordTransform);

  const resultEuler = new THREE.Euler().setFromRotationMatrix(matrix, 'XYZ');
  return resultEuler;
}

// STL Mesh component with URDF origin transform
const URDFMesh: React.FC<{
  file: string;
  origin: { xyz: number[]; rpy: number[] };
  material?: typeof MAT.printed;
}> = ({ file, origin, material = MAT.printed }) => {
  const geometry = useLoader(STLLoader, `${STL_PATH}/${file}`);

  const processedGeometry = useMemo(() => {
    const geo = geometry.clone();
    geo.computeVertexNormals();
    // Don't center - use original geometry position with URDF transform
    return geo;
  }, [geometry]);

  // Apply URDF origin transform
  const position = urdfToThreePos(origin.xyz);
  const rotation = urdfToThreeRot(origin.rpy);

  return (
    <mesh
      geometry={processedGeometry}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial {...material} />
    </mesh>
  );
};

// Joint group component that applies URDF joint transform
const URDFJoint: React.FC<{
  jointOrigin: { xyz: number[]; rpy: number[] };
  rotation?: number;  // Additional rotation around joint axis (Z in URDF)
  children: React.ReactNode;
}> = ({ jointOrigin, rotation = 0, children }) => {
  const position = urdfToThreePos(jointOrigin.xyz);
  const baseRotation = urdfToThreeRot(jointOrigin.rpy);

  // Joint rotation is around Z in URDF frame
  // After coordinate transform, need to apply around correct axis
  return (
    <group position={position} rotation={baseRotation}>
      <group rotation={[0, rotation, 0]}>
        {children}
      </group>
    </group>
  );
};

const LoadingFallback: React.FC = () => (
  <mesh position={[0, 0.15, 0]}>
    <boxGeometry args={[0.05, 0.3, 0.05]} />
    <meshStandardMaterial color="gray" wireframe />
  </mesh>
);

const SO100Arm3DInner: React.FC<SO100ArmProps> = ({ joints }) => {
  // Convert degrees to radians for joint rotations
  const baseRot = (joints.base * Math.PI) / 180;
  const shoulderRot = (joints.shoulder * Math.PI) / 180;
  const elbowRot = (joints.elbow * Math.PI) / 180;
  const wristRot = (joints.wrist * Math.PI) / 180;
  const gripperRot = (joints.gripper / 100) * 1.74533;  // Max gripper angle from URDF

  return (
    <group>
      {/* ========== BASE_LINK (fixed) ========== */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.06, 0.04, 0.06]} position={[0, 0.04, 0]} />

        {/* Base plate */}
        <URDFMesh file="base_so101_v2.stl" origin={URDF_VISUALS.base} />

        {/* Motor holder tower */}
        <URDFMesh file="base_motor_holder_so101_v1.stl" origin={URDF_VISUALS.base_motor_holder} />

        {/* Base servo */}
        <URDFMesh file="sts3215_03a_v1.stl" origin={URDF_VISUALS.base_servo} material={MAT.servo} />
      </RigidBody>

      {/* ========== SHOULDER_LINK (shoulder_pan joint) ========== */}
      <URDFJoint jointOrigin={URDF_JOINTS.shoulder_pan} rotation={baseRot}>

        {/* Rotation pitch bracket */}
        <URDFMesh file="rotation_pitch_so101_v1.stl" origin={URDF_VISUALS.rotation_pitch} />

        {/* Motor holder at shoulder */}
        <URDFMesh file="motor_holder_so101_base_v1.stl" origin={URDF_VISUALS.motor_holder_base} />

        {/* Shoulder servo */}
        <URDFMesh file="sts3215_03a_v1.stl" origin={URDF_VISUALS.shoulder_servo} material={MAT.servo} />

        {/* ========== UPPER_ARM_LINK (shoulder_lift joint) ========== */}
        <URDFJoint jointOrigin={URDF_JOINTS.shoulder_lift} rotation={shoulderRot}>

          {/* Upper arm */}
          <URDFMesh file="upper_arm_so101_v1.stl" origin={URDF_VISUALS.upper_arm} />

          {/* Upper arm servo (at elbow) */}
          <URDFMesh file="sts3215_03a_v1.stl" origin={URDF_VISUALS.upper_arm_servo} material={MAT.servo} />

          {/* ========== LOWER_ARM_LINK (elbow_flex joint) ========== */}
          <URDFJoint jointOrigin={URDF_JOINTS.elbow_flex} rotation={elbowRot}>

            {/* Under arm / forearm */}
            <URDFMesh file="under_arm_so101_v1.stl" origin={URDF_VISUALS.under_arm} />

            {/* Wrist motor holder */}
            <URDFMesh file="motor_holder_so101_wrist_v1.stl" origin={URDF_VISUALS.motor_holder_wrist} />

            {/* Lower arm servo */}
            <URDFMesh file="sts3215_03a_v1.stl" origin={URDF_VISUALS.lower_arm_servo} material={MAT.servo} />

            {/* ========== WRIST_LINK (wrist_flex joint) ========== */}
            <URDFJoint jointOrigin={URDF_JOINTS.wrist_flex} rotation={wristRot}>

              {/* Wrist roll/pitch bracket */}
              <URDFMesh file="wrist_roll_pitch_so101_v2.stl" origin={URDF_VISUALS.wrist_roll_pitch} />

              {/* Wrist servo */}
              <URDFMesh file="sts3215_03a_no_horn_v1.stl" origin={URDF_VISUALS.wrist_servo} material={MAT.servo} />

              {/* ========== GRIPPER_LINK (wrist_roll joint) ========== */}
              <URDFJoint jointOrigin={URDF_JOINTS.wrist_roll} rotation={0}>

                {/* Gripper follower base */}
                <URDFMesh file="wrist_roll_follower_so101_v1.stl" origin={URDF_VISUALS.wrist_roll_follower} />

                {/* Gripper servo */}
                <URDFMesh file="sts3215_03a_v1.stl" origin={URDF_VISUALS.gripper_servo} material={MAT.servo} />

                {/* ========== MOVING_JAW (gripper joint) ========== */}
                <URDFJoint jointOrigin={URDF_JOINTS.gripper} rotation={gripperRot}>
                  <URDFMesh file="moving_jaw_so101_v1.stl" origin={URDF_VISUALS.moving_jaw} />
                </URDFJoint>
              </URDFJoint>
            </URDFJoint>
          </URDFJoint>
        </URDFJoint>
      </URDFJoint>
    </group>
  );
};

export const SO100Arm3D: React.FC<SO100ArmProps> = ({ joints }) => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SO100Arm3DInner joints={joints} />
    </Suspense>
  );
};
