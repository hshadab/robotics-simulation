/**
 * Parameterized Task Templates
 *
 * Provides configurable task templates with randomizable parameters
 * for generating diverse training data. Each parameter can have:
 * - A default value
 * - Min/max range for randomization
 * - Whether to enable randomization
 */

import type { JointState } from '../types';

/**
 * A single parameter that can be randomized
 */
export interface TaskParameter {
  name: string;
  description: string;
  defaultValue: number;
  min: number;
  max: number;
  unit: string;
  randomize: boolean;
}

/**
 * A waypoint with parameterized joint values
 * Values can be numbers or parameter references (e.g., "${pickAngle}")
 */
export interface ParameterizedWaypoint {
  name: string;
  joints: {
    base: number | string;
    shoulder: number | string;
    elbow: number | string;
    wrist: number | string;
    wristRoll: number | string;
    gripper: number | string;
  };
  duration?: number;
}

/**
 * A parameterized task template
 */
export interface ParameterizedTaskTemplate {
  id: string;
  name: string;
  description: string;
  category: 'manipulation' | 'navigation' | 'inspection';
  parameters: TaskParameter[];
  waypoints: ParameterizedWaypoint[];
}

/**
 * Resolved task template with concrete joint values
 */
export interface ResolvedTaskTemplate {
  id: string;
  name: string;
  waypoints: JointState[];
  durations: number[];
  parameterValues: Record<string, number>;
}

/**
 * Default task parameters for common operations
 */
export const DEFAULT_PARAMETERS: Record<string, TaskParameter> = {
  pickBaseAngle: {
    name: 'pickBaseAngle',
    description: 'Base rotation angle for pick position',
    defaultValue: 0,
    min: -90,
    max: 90,
    unit: '°',
    randomize: true,
  },
  placeBaseAngle: {
    name: 'placeBaseAngle',
    description: 'Base rotation angle for place position',
    defaultValue: 90,
    min: -90,
    max: 90,
    unit: '°',
    randomize: true,
  },
  pickHeight: {
    name: 'pickHeight',
    description: 'Shoulder angle for pick height (more negative = lower)',
    defaultValue: -50,
    min: -70,
    max: -30,
    unit: '°',
    randomize: true,
  },
  placeHeight: {
    name: 'placeHeight',
    description: 'Shoulder angle for place height',
    defaultValue: -50,
    min: -70,
    max: -30,
    unit: '°',
    randomize: true,
  },
  reachExtension: {
    name: 'reachExtension',
    description: 'Elbow angle for reach distance',
    defaultValue: 70,
    min: 50,
    max: 90,
    unit: '°',
    randomize: true,
  },
  gripperOpenAmount: {
    name: 'gripperOpenAmount',
    description: 'Gripper opening percentage',
    defaultValue: 100,
    min: 80,
    max: 100,
    unit: '%',
    randomize: false,
  },
  gripperCloseAmount: {
    name: 'gripperCloseAmount',
    description: 'Gripper closing percentage',
    defaultValue: 20,
    min: 0,
    max: 40,
    unit: '%',
    randomize: true,
  },
  movementSpeed: {
    name: 'movementSpeed',
    description: 'Overall movement speed multiplier',
    defaultValue: 1.0,
    min: 0.5,
    max: 2.0,
    unit: 'x',
    randomize: true,
  },
};

/**
 * Predefined parameterized task templates
 */
export const PARAMETERIZED_TEMPLATES: ParameterizedTaskTemplate[] = [
  {
    id: 'pick-place-parameterized',
    name: 'Pick & Place (Configurable)',
    description: 'Pick and place with randomizable positions',
    category: 'manipulation',
    parameters: [
      DEFAULT_PARAMETERS.pickBaseAngle,
      DEFAULT_PARAMETERS.placeBaseAngle,
      DEFAULT_PARAMETERS.pickHeight,
      DEFAULT_PARAMETERS.placeHeight,
      DEFAULT_PARAMETERS.reachExtension,
      DEFAULT_PARAMETERS.gripperOpenAmount,
      DEFAULT_PARAMETERS.gripperCloseAmount,
      DEFAULT_PARAMETERS.movementSpeed,
    ],
    waypoints: [
      {
        name: 'Home',
        joints: { base: 0, shoulder: 0, elbow: 0, wrist: 0, wristRoll: 0, gripper: 50 },
        duration: 0.8,
      },
      {
        name: 'Pick Ready',
        joints: {
          base: '${pickBaseAngle}',
          shoulder: -30,
          elbow: 60,
          wrist: -30,
          wristRoll: 0,
          gripper: '${gripperOpenAmount}',
        },
        duration: 0.5,
      },
      {
        name: 'Pick Down',
        joints: {
          base: '${pickBaseAngle}',
          shoulder: '${pickHeight}',
          elbow: '${reachExtension}',
          wrist: -20,
          wristRoll: 0,
          gripper: '${gripperOpenAmount}',
        },
        duration: 0.3,
      },
      {
        name: 'Grasp',
        joints: {
          base: '${pickBaseAngle}',
          shoulder: '${pickHeight}',
          elbow: '${reachExtension}',
          wrist: -20,
          wristRoll: 0,
          gripper: '${gripperCloseAmount}',
        },
        duration: 0.5,
      },
      {
        name: 'Lift',
        joints: {
          base: '${pickBaseAngle}',
          shoulder: -30,
          elbow: 60,
          wrist: -30,
          wristRoll: 0,
          gripper: '${gripperCloseAmount}',
        },
        duration: 1.0,
      },
      {
        name: 'Place Ready',
        joints: {
          base: '${placeBaseAngle}',
          shoulder: -30,
          elbow: 60,
          wrist: -30,
          wristRoll: 0,
          gripper: '${gripperCloseAmount}',
        },
        duration: 0.5,
      },
      {
        name: 'Place Down',
        joints: {
          base: '${placeBaseAngle}',
          shoulder: '${placeHeight}',
          elbow: '${reachExtension}',
          wrist: -20,
          wristRoll: 0,
          gripper: '${gripperCloseAmount}',
        },
        duration: 0.3,
      },
      {
        name: 'Release',
        joints: {
          base: '${placeBaseAngle}',
          shoulder: '${placeHeight}',
          elbow: '${reachExtension}',
          wrist: -20,
          wristRoll: 0,
          gripper: '${gripperOpenAmount}',
        },
        duration: 0.5,
      },
      {
        name: 'Retreat',
        joints: {
          base: '${placeBaseAngle}',
          shoulder: -30,
          elbow: 60,
          wrist: -30,
          wristRoll: 0,
          gripper: '${gripperOpenAmount}',
        },
        duration: 0.8,
      },
      {
        name: 'Return Home',
        joints: { base: 0, shoulder: 0, elbow: 0, wrist: 0, wristRoll: 0, gripper: 50 },
        duration: 0.8,
      },
    ],
  },
  {
    id: 'reach-touch-parameterized',
    name: 'Reach & Touch (Configurable)',
    description: 'Reach to a target position',
    category: 'manipulation',
    parameters: [
      {
        name: 'targetBaseAngle',
        description: 'Base rotation to target',
        defaultValue: 45,
        min: -90,
        max: 90,
        unit: '°',
        randomize: true,
      },
      {
        name: 'targetShoulder',
        description: 'Shoulder angle for reach',
        defaultValue: -40,
        min: -60,
        max: -20,
        unit: '°',
        randomize: true,
      },
      {
        name: 'targetElbow',
        description: 'Elbow extension',
        defaultValue: 60,
        min: 40,
        max: 80,
        unit: '°',
        randomize: true,
      },
      DEFAULT_PARAMETERS.movementSpeed,
    ],
    waypoints: [
      {
        name: 'Home',
        joints: { base: 0, shoulder: 0, elbow: 0, wrist: 0, wristRoll: 0, gripper: 50 },
        duration: 0.5,
      },
      {
        name: 'Approach',
        joints: {
          base: '${targetBaseAngle}',
          shoulder: -20,
          elbow: 40,
          wrist: -20,
          wristRoll: 0,
          gripper: 50,
        },
        duration: 0.8,
      },
      {
        name: 'Reach',
        joints: {
          base: '${targetBaseAngle}',
          shoulder: '${targetShoulder}',
          elbow: '${targetElbow}',
          wrist: -20,
          wristRoll: 0,
          gripper: 50,
        },
        duration: 0.5,
      },
      {
        name: 'Hold',
        joints: {
          base: '${targetBaseAngle}',
          shoulder: '${targetShoulder}',
          elbow: '${targetElbow}',
          wrist: -20,
          wristRoll: 0,
          gripper: 50,
        },
        duration: 0.3,
      },
      {
        name: 'Retreat',
        joints: {
          base: '${targetBaseAngle}',
          shoulder: -20,
          elbow: 40,
          wrist: -20,
          wristRoll: 0,
          gripper: 50,
        },
        duration: 0.5,
      },
      {
        name: 'Return Home',
        joints: { base: 0, shoulder: 0, elbow: 0, wrist: 0, wristRoll: 0, gripper: 50 },
        duration: 0.5,
      },
    ],
  },
  {
    id: 'sweep-scan-parameterized',
    name: 'Sweep Scan (Configurable)',
    description: 'Sweep across workspace for inspection',
    category: 'inspection',
    parameters: [
      {
        name: 'sweepStart',
        description: 'Starting base angle',
        defaultValue: -90,
        min: -120,
        max: -45,
        unit: '°',
        randomize: true,
      },
      {
        name: 'sweepEnd',
        description: 'Ending base angle',
        defaultValue: 90,
        min: 45,
        max: 120,
        unit: '°',
        randomize: true,
      },
      {
        name: 'scanHeight',
        description: 'Height of scan (shoulder angle)',
        defaultValue: -30,
        min: -50,
        max: -15,
        unit: '°',
        randomize: true,
      },
      {
        name: 'scanReach',
        description: 'Reach distance (elbow angle)',
        defaultValue: 50,
        min: 40,
        max: 70,
        unit: '°',
        randomize: true,
      },
      DEFAULT_PARAMETERS.movementSpeed,
    ],
    waypoints: [
      {
        name: 'Home',
        joints: { base: 0, shoulder: 0, elbow: 0, wrist: 0, wristRoll: 0, gripper: 50 },
        duration: 0.5,
      },
      {
        name: 'Scan Start',
        joints: {
          base: '${sweepStart}',
          shoulder: '${scanHeight}',
          elbow: '${scanReach}',
          wrist: -20,
          wristRoll: 0,
          gripper: 50,
        },
        duration: 1.0,
      },
      {
        name: 'Mid Point 1',
        joints: {
          base: '${sweepStart * 0.33 + sweepEnd * 0.67}',
          shoulder: '${scanHeight}',
          elbow: '${scanReach}',
          wrist: -20,
          wristRoll: 0,
          gripper: 50,
        },
        duration: 1.5,
      },
      {
        name: 'Mid Point 2',
        joints: {
          base: '${sweepStart * 0.67 + sweepEnd * 0.33}',
          shoulder: '${scanHeight}',
          elbow: '${scanReach}',
          wrist: -20,
          wristRoll: 0,
          gripper: 50,
        },
        duration: 1.5,
      },
      {
        name: 'Scan End',
        joints: {
          base: '${sweepEnd}',
          shoulder: '${scanHeight}',
          elbow: '${scanReach}',
          wrist: -20,
          wristRoll: 0,
          gripper: 50,
        },
        duration: 1.5,
      },
      {
        name: 'Return Home',
        joints: { base: 0, shoulder: 0, elbow: 0, wrist: 0, wristRoll: 0, gripper: 50 },
        duration: 1.0,
      },
    ],
  },
];

/**
 * Generate a random value within parameter range
 */
function randomizeParameter(param: TaskParameter): number {
  if (!param.randomize) {
    return param.defaultValue;
  }
  return param.min + Math.random() * (param.max - param.min);
}

/**
 * Resolve a parameter reference string like "${pickBaseAngle}"
 * Also handles simple expressions like "${sweepStart * 0.5 + sweepEnd * 0.5}"
 */
function resolveParameterValue(
  value: number | string,
  paramValues: Record<string, number>
): number {
  if (typeof value === 'number') {
    return value;
  }

  // Extract expression from ${...}
  const match = value.match(/^\$\{(.+)\}$/);
  if (!match) {
    return parseFloat(value) || 0;
  }

  const expression = match[1];

  // Simple parameter reference
  if (paramValues[expression] !== undefined) {
    return paramValues[expression];
  }

  // Handle simple arithmetic expressions
  // Replace parameter names with values and evaluate
  let evalExpression = expression;
  for (const [name, val] of Object.entries(paramValues)) {
    evalExpression = evalExpression.replace(new RegExp(name, 'g'), val.toString());
  }

  // Safe evaluation of simple arithmetic
  try {
    // Only allow numbers, operators, parentheses, and spaces
    if (/^[\d\s+\-*/.()]+$/.test(evalExpression)) {
      // Using Function constructor for controlled evaluation
      return new Function(`return ${evalExpression}`)() as number;
    }
  } catch {
    console.warn(`Failed to evaluate expression: ${expression}`);
  }

  return 0;
}

/**
 * Resolve a parameterized waypoint to concrete joint values
 */
function resolveWaypoint(
  waypoint: ParameterizedWaypoint,
  paramValues: Record<string, number>
): JointState {
  return {
    base: resolveParameterValue(waypoint.joints.base, paramValues),
    shoulder: resolveParameterValue(waypoint.joints.shoulder, paramValues),
    elbow: resolveParameterValue(waypoint.joints.elbow, paramValues),
    wrist: resolveParameterValue(waypoint.joints.wrist, paramValues),
    wristRoll: resolveParameterValue(waypoint.joints.wristRoll, paramValues),
    gripper: resolveParameterValue(waypoint.joints.gripper, paramValues),
  };
}

/**
 * Resolve a full task template with given or randomized parameters
 */
export function resolveTaskTemplate(
  template: ParameterizedTaskTemplate,
  customValues?: Partial<Record<string, number>>
): ResolvedTaskTemplate {
  // Generate parameter values (randomized or custom)
  const paramValues: Record<string, number> = {};
  for (const param of template.parameters) {
    if (customValues && customValues[param.name] !== undefined) {
      paramValues[param.name] = customValues[param.name]!;
    } else {
      paramValues[param.name] = randomizeParameter(param);
    }
  }

  // Get movement speed for duration scaling
  const speedMultiplier = paramValues.movementSpeed || 1.0;

  // Resolve waypoints
  const waypoints = template.waypoints.map((wp) => resolveWaypoint(wp, paramValues));
  const durations = template.waypoints.map((wp) => (wp.duration || 0.5) / speedMultiplier);

  return {
    id: template.id,
    name: template.name,
    waypoints,
    durations,
    parameterValues: paramValues,
  };
}

/**
 * Generate multiple variations of a task template
 */
export function generateTaskVariations(
  template: ParameterizedTaskTemplate,
  count: number
): ResolvedTaskTemplate[] {
  const variations: ResolvedTaskTemplate[] = [];
  for (let i = 0; i < count; i++) {
    variations.push(resolveTaskTemplate(template));
  }
  return variations;
}

/**
 * Get default parameter values (no randomization)
 */
export function getDefaultParameterValues(
  template: ParameterizedTaskTemplate
): Record<string, number> {
  const values: Record<string, number> = {};
  for (const param of template.parameters) {
    values[param.name] = param.defaultValue;
  }
  return values;
}

/**
 * Validate that all parameter references in waypoints are defined
 */
export function validateTemplate(template: ParameterizedTaskTemplate): string[] {
  const errors: string[] = [];
  const paramNames = new Set(template.parameters.map((p) => p.name));

  for (const waypoint of template.waypoints) {
    for (const [joint, value] of Object.entries(waypoint.joints)) {
      if (typeof value === 'string') {
        const match = value.match(/\$\{([^}]+)\}/g);
        if (match) {
          for (const ref of match) {
            const paramName = ref.slice(2, -1).split(/[+\-*/\s]/)[0].trim();
            if (!paramNames.has(paramName) && !/^\d+$/.test(paramName)) {
              errors.push(`Waypoint "${waypoint.name}" joint "${joint}" references undefined parameter "${paramName}"`);
            }
          }
        }
      }
    }
  }

  return errors;
}
