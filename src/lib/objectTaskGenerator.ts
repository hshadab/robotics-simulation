/**
 * Object Task Template Generator
 *
 * Automatically generates robot training task templates for custom 3D objects
 */

import type { Generated3DObject, GraspPoint } from './csmImageTo3D';
import type { ParameterizedTaskTemplate, TaskParameter, ParameterizedWaypoint } from './taskTemplates';

export interface ObjectTaskConfig {
  object: Generated3DObject;
  taskTypes: ('pickup' | 'place' | 'handover' | 'inspect')[];
  approachAngles?: number;
  workspaceBounds?: [number, number, number, number];
}

export function generateObjectTaskTemplates(
  config: ObjectTaskConfig
): ParameterizedTaskTemplate[] {
  const templates: ParameterizedTaskTemplate[] = [];
  const { object, taskTypes } = config;
  const approachAngles = config.approachAngles || 4;
  const bounds = config.workspaceBounds || [-0.3, 0.3, 0.1, 0.4];

  const primaryGrasp = object.graspPoints.sort((a, b) => b.confidence - a.confidence)[0];

  if (taskTypes.includes('pickup')) {
    templates.push(generatePickupTemplate(object, primaryGrasp, approachAngles, bounds));
  }

  if (taskTypes.includes('place')) {
    templates.push(generatePlaceTemplate(object, primaryGrasp, bounds));
  }

  if (taskTypes.includes('handover')) {
    templates.push(generateHandoverTemplate(object, primaryGrasp));
  }

  if (taskTypes.includes('inspect')) {
    templates.push(generateInspectTemplate(object));
  }

  return templates;
}

function generatePickupTemplate(
  object: Generated3DObject,
  grasp: GraspPoint | undefined,
  _numAngles: number,
  bounds: [number, number, number, number]
): ParameterizedTaskTemplate {
  const [minX, maxX, minY, maxY] = bounds;
  const objectHeight = object.dimensions[1];
  const gripperOpen = 100;
  const gripperClosed = Math.max(10, Math.min(50, object.dimensions[0] * 500));

  const parameters: TaskParameter[] = [
    { name: 'objectX', description: 'Object X Position', defaultValue: 0, min: minX * 100, max: maxX * 100, unit: 'cm', randomize: true },
    { name: 'objectY', description: 'Object Y Position', defaultValue: 25, min: minY * 100, max: maxY * 100, unit: 'cm', randomize: true },
    { name: 'approachAngle', description: 'Approach Angle', defaultValue: 0, min: -45, max: 45, unit: '°', randomize: true },
    { name: 'liftHeight', description: 'Lift Height', defaultValue: 10, min: 5, max: 20, unit: 'cm', randomize: true },
  ];

  const waypoints: ParameterizedWaypoint[] = [
    { name: 'Home', joints: { base: 0, shoulder: 0, elbow: 0, wrist: 0, wristRoll: 0, gripper: gripperOpen }, duration: 0.5 },
    { name: 'Approach', joints: { base: '${approachAngle}', shoulder: -25, elbow: 50, wrist: -25, wristRoll: 0, gripper: gripperOpen }, duration: 0.8 },
    { name: 'Pre-grasp', joints: { base: '${approachAngle}', shoulder: -40, elbow: 65, wrist: -25, wristRoll: 0, gripper: gripperOpen }, duration: 0.6 },
    { name: 'Grasp', joints: { base: '${approachAngle}', shoulder: -40, elbow: 65, wrist: -25, wristRoll: 0, gripper: gripperClosed }, duration: 0.3 },
    { name: 'Lift', joints: { base: '${approachAngle}', shoulder: -20, elbow: 45, wrist: -25, wristRoll: 0, gripper: gripperClosed }, duration: 0.6 },
  ];

  return {
    id: 'pickup-' + object.name,
    name: 'Pick Up ' + object.name,
    description: 'Pick up the ' + object.name + ' from the workspace. Object height: ' + (objectHeight * 100).toFixed(1) + 'cm. Grasp type: ' + (grasp?.graspType || 'power'),
    category: 'manipulation',
    parameters,
    waypoints,
  };
}

function generatePlaceTemplate(
  object: Generated3DObject,
  grasp: GraspPoint | undefined,
  bounds: [number, number, number, number]
): ParameterizedTaskTemplate {
  const [minX, maxX, minY, maxY] = bounds;
  const gripperClosed = Math.max(10, Math.min(50, object.dimensions[0] * 500));
  const gripperOpen = 100;

  const parameters: TaskParameter[] = [
    { name: 'placeX', description: 'Place X Position', defaultValue: 15, min: minX * 100, max: maxX * 100, unit: 'cm', randomize: true },
    { name: 'placeY', description: 'Place Y Position', defaultValue: 30, min: minY * 100, max: maxY * 100, unit: 'cm', randomize: true },
    { name: 'placeAngle', description: 'Place Angle', defaultValue: 30, min: -60, max: 60, unit: '°', randomize: true },
  ];

  const waypoints: ParameterizedWaypoint[] = [
    { name: 'Start holding', joints: { base: 0, shoulder: -20, elbow: 45, wrist: -25, wristRoll: 0, gripper: gripperClosed }, duration: 0.6 },
    { name: 'Move to place', joints: { base: '${placeAngle}', shoulder: -25, elbow: 50, wrist: -25, wristRoll: 0, gripper: gripperClosed }, duration: 0.8 },
    { name: 'Lower', joints: { base: '${placeAngle}', shoulder: -40, elbow: 65, wrist: -25, wristRoll: 0, gripper: gripperClosed }, duration: 0.5 },
    { name: 'Release', joints: { base: '${placeAngle}', shoulder: -40, elbow: 65, wrist: -25, wristRoll: 0, gripper: gripperOpen }, duration: 0.3 },
    { name: 'Retreat', joints: { base: '${placeAngle}', shoulder: -20, elbow: 40, wrist: -20, wristRoll: 0, gripper: gripperOpen }, duration: 0.5 },
  ];

  return {
    id: 'place-' + object.name,
    name: 'Place ' + object.name,
    description: 'Place the ' + object.name + ' at a target location. Grasp type: ' + (grasp?.graspType || 'power'),
    category: 'manipulation',
    parameters,
    waypoints,
  };
}

function generateHandoverTemplate(
  object: Generated3DObject,
  grasp: GraspPoint | undefined
): ParameterizedTaskTemplate {
  const gripperClosed = Math.max(10, Math.min(50, object.dimensions[0] * 500));
  const gripperOpen = 100;

  const parameters: TaskParameter[] = [
    { name: 'handoverHeight', description: 'Handover Height', defaultValue: 25, min: 15, max: 35, unit: 'cm', randomize: true },
    { name: 'handoverAngle', description: 'Handover Angle', defaultValue: 0, min: -30, max: 30, unit: '°', randomize: true },
  ];

  const waypoints: ParameterizedWaypoint[] = [
    { name: 'Start holding', joints: { base: 0, shoulder: -20, elbow: 45, wrist: -25, wristRoll: 0, gripper: gripperClosed }, duration: 0.6 },
    { name: 'Present', joints: { base: '${handoverAngle}', shoulder: -15, elbow: 30, wrist: -15, wristRoll: 0, gripper: gripperClosed }, duration: 0.8 },
    { name: 'Offer', joints: { base: '${handoverAngle}', shoulder: -10, elbow: 25, wrist: -15, wristRoll: 45, gripper: gripperClosed }, duration: 0.5 },
    { name: 'Release', joints: { base: '${handoverAngle}', shoulder: -10, elbow: 25, wrist: -15, wristRoll: 45, gripper: gripperOpen }, duration: 0.5 },
    { name: 'Retreat', joints: { base: 0, shoulder: -20, elbow: 40, wrist: -20, wristRoll: 0, gripper: gripperOpen }, duration: 0.6 },
  ];

  return {
    id: 'handover-' + object.name,
    name: 'Hand Over ' + object.name,
    description: 'Present the ' + object.name + ' for human handover. Grasp type: ' + (grasp?.graspType || 'power'),
    category: 'manipulation',
    parameters,
    waypoints,
  };
}

function generateInspectTemplate(object: Generated3DObject): ParameterizedTaskTemplate {
  const gripperClosed = Math.max(10, Math.min(50, object.dimensions[0] * 500));

  const parameters: TaskParameter[] = [
    { name: 'inspectAngle1', description: 'First Rotation', defaultValue: 45, min: -90, max: 90, unit: '°', randomize: true },
    { name: 'inspectAngle2', description: 'Second Rotation', defaultValue: -45, min: -90, max: 90, unit: '°', randomize: true },
  ];

  const waypoints: ParameterizedWaypoint[] = [
    { name: 'Start holding', joints: { base: 0, shoulder: -20, elbow: 45, wrist: -25, wristRoll: 0, gripper: gripperClosed }, duration: 0.5 },
    { name: 'Raise', joints: { base: 0, shoulder: -10, elbow: 30, wrist: -20, wristRoll: 0, gripper: gripperClosed }, duration: 0.6 },
    { name: 'Rotate 1', joints: { base: '${inspectAngle1}', shoulder: -10, elbow: 30, wrist: -20, wristRoll: 45, gripper: gripperClosed }, duration: 0.8 },
    { name: 'Rotate 2', joints: { base: '${inspectAngle2}', shoulder: -10, elbow: 30, wrist: -20, wristRoll: -45, gripper: gripperClosed }, duration: 0.8 },
    { name: 'Return', joints: { base: 0, shoulder: -20, elbow: 45, wrist: -25, wristRoll: 0, gripper: gripperClosed }, duration: 0.6 },
  ];

  return {
    id: 'inspect-' + object.name,
    name: 'Inspect ' + object.name,
    description: 'Rotate and inspect the ' + object.name + ' from multiple angles',
    category: 'inspection',
    parameters,
    waypoints,
  };
}

export function estimateTrainingEpisodes(
  templates: ParameterizedTaskTemplate[],
  episodesPerTemplate = 50,
  augmentationMultiplier = 5
): { baseEpisodes: number; augmentedEpisodes: number; totalEpisodes: number; estimatedTrainingTime: string } {
  const baseEpisodes = templates.length * episodesPerTemplate;
  const augmentedEpisodes = baseEpisodes * augmentationMultiplier;
  const totalEpisodes = baseEpisodes + augmentedEpisodes;

  const trainingMinutes = (totalEpisodes / 1000) * 30;
  let estimatedTrainingTime: string;
  if (trainingMinutes < 60) {
    estimatedTrainingTime = Math.round(trainingMinutes) + ' minutes';
  } else {
    estimatedTrainingTime = (trainingMinutes / 60).toFixed(1) + ' hours';
  }

  return { baseEpisodes, augmentedEpisodes, totalEpisodes, estimatedTrainingTime };
}
