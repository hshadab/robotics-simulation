/**
 * State Serializer - Shareable Simulation URLs
 *
 * Serializes and deserializes simulation state to/from URL-safe strings.
 * Uses JSON + base64 encoding for compact URL sharing.
 */

import type {
  JointState,
  ActiveRobotType,
  EnvironmentType,
  WheeledRobotState,
  DroneState,
} from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface ShareableState {
  // Version for future compatibility
  v: number;

  // Robot configuration
  r: string;           // robotId
  t: ActiveRobotType;  // activeRobotType

  // Code
  c: string;           // code source

  // Robot-specific state
  j?: Partial<JointState>;           // arm joints
  w?: Partial<WheeledRobotState>;    // wheeled robot
  d?: Partial<DroneState>;           // drone

  // Environment
  e?: EnvironmentType;

  // Metadata
  n?: string;          // name (optional)
  desc?: string;       // description (optional)
}

export interface ParsedShareState {
  robotId: string;
  activeRobotType: ActiveRobotType;
  code: string;
  joints?: Partial<JointState>;
  wheeledRobot?: Partial<WheeledRobotState>;
  drone?: Partial<DroneState>;
  environment?: EnvironmentType;
  name?: string;
  description?: string;
}

// ============================================================================
// ENCODING/DECODING
// ============================================================================

/**
 * Encode state to a URL-safe string
 */
function encodeState(state: ShareableState): string {
  try {
    const json = JSON.stringify(state);
    // Use base64 encoding
    const base64 = btoa(unescape(encodeURIComponent(json)));
    // Make URL-safe
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (error) {
    console.error('Failed to encode state:', error);
    throw new Error('Failed to encode simulation state');
  }
}

/**
 * Decode state from a URL-safe string
 */
function decodeState(encoded: string): ShareableState {
  try {
    // Restore base64 padding and characters
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const json = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(json) as ShareableState;
  } catch (error) {
    console.error('Failed to decode state:', error);
    throw new Error('Failed to decode simulation state');
  }
}

// ============================================================================
// SERIALIZATION
// ============================================================================

interface SerializeOptions {
  robotId: string;
  activeRobotType: ActiveRobotType;
  code: string;
  joints?: JointState;
  wheeledRobot?: WheeledRobotState;
  drone?: DroneState;
  environment?: EnvironmentType;
  name?: string;
  description?: string;
}

/**
 * Serialize current state to a shareable URL hash
 */
export function serializeState(options: SerializeOptions): string {
  const state: ShareableState = {
    v: 1,
    r: options.robotId,
    t: options.activeRobotType,
    c: options.code,
  };

  // Add robot-specific state based on type
  if (options.activeRobotType === 'arm' && options.joints) {
    state.j = {
      base: options.joints.base,
      shoulder: options.joints.shoulder,
      elbow: options.joints.elbow,
      wrist: options.joints.wrist,
      gripper: options.joints.gripper,
    };
  }

  if (options.activeRobotType === 'wheeled' && options.wheeledRobot) {
    state.w = {
      leftWheelSpeed: options.wheeledRobot.leftWheelSpeed,
      rightWheelSpeed: options.wheeledRobot.rightWheelSpeed,
      servoHead: options.wheeledRobot.servoHead,
    };
  }

  if (options.activeRobotType === 'drone' && options.drone) {
    state.d = {
      position: options.drone.position,
      rotation: options.drone.rotation,
      throttle: options.drone.throttle,
      armed: options.drone.armed,
      flightMode: options.drone.flightMode,
    };
  }

  if (options.environment) {
    state.e = options.environment;
  }

  if (options.name) {
    state.n = options.name;
  }

  if (options.description) {
    state.desc = options.description;
  }

  return encodeState(state);
}

/**
 * Deserialize state from URL hash
 */
export function deserializeState(encoded: string): ParsedShareState | null {
  try {
    const state = decodeState(encoded);

    // Validate version
    if (state.v !== 1) {
      console.warn('Unknown state version:', state.v);
    }

    const parsed: ParsedShareState = {
      robotId: state.r,
      activeRobotType: state.t,
      code: state.c,
    };

    if (state.j) {
      parsed.joints = state.j;
    }

    if (state.w) {
      parsed.wheeledRobot = state.w;
    }

    if (state.d) {
      parsed.drone = state.d;
    }

    if (state.e) {
      parsed.environment = state.e;
    }

    if (state.n) {
      parsed.name = state.n;
    }

    if (state.desc) {
      parsed.description = state.desc;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to deserialize state:', error);
    return null;
  }
}

// ============================================================================
// URL HELPERS
// ============================================================================

/**
 * Generate a shareable URL for current state
 */
export function generateShareUrl(options: SerializeOptions): string {
  const hash = serializeState(options);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#share/${hash}`;
}

/**
 * Parse share data from current URL
 */
export function parseShareUrl(): ParsedShareState | null {
  const hash = window.location.hash;

  if (!hash.startsWith('#share/')) {
    return null;
  }

  const encoded = hash.slice(7); // Remove '#share/'
  return deserializeState(encoded);
}

/**
 * Check if current URL contains share data
 */
export function hasShareData(): boolean {
  return window.location.hash.startsWith('#share/');
}

/**
 * Clear share data from URL without page reload
 */
export function clearShareUrl(): void {
  window.history.replaceState(null, '', window.location.pathname);
}

// ============================================================================
// CLIPBOARD HELPERS
// ============================================================================

/**
 * Copy share URL to clipboard
 */
export async function copyShareUrl(options: SerializeOptions): Promise<boolean> {
  try {
    const url = generateShareUrl(options);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

// ============================================================================
// SIZE ESTIMATION
// ============================================================================

/**
 * Estimate the size of the share URL
 */
export function estimateUrlSize(options: SerializeOptions): {
  bytes: number;
  isLarge: boolean;
  warning?: string;
} {
  const hash = serializeState(options);
  const bytes = new Blob([hash]).size;

  // URLs over 2000 characters can have issues in some browsers
  const isLarge = bytes > 1500;
  const warning = isLarge
    ? 'URL is large. Consider shortening your code for reliable sharing.'
    : undefined;

  return { bytes, isLarge, warning };
}

// ============================================================================
// COMPRESSION (Optional - for larger states)
// ============================================================================

/**
 * Simple compression using repeated character reduction
 * For more aggressive compression, consider adding lz-string library
 */
export function compressCode(code: string): string {
  // Remove excessive whitespace
  return code
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/  +/g, ' ')
    .trim();
}
