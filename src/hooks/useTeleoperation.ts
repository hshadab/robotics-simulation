/**
 * Teleoperation Hooks
 *
 * Provides keyboard and gamepad controls for smoother robot teleoperation
 * during dataset recording. Produces more natural, human-like demonstrations.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { JointState } from '../types';

/**
 * Keyboard control mapping for robot arm
 */
export interface KeyboardMapping {
  // Joint controls (hold to move)
  base: { positive: string; negative: string };
  shoulder: { positive: string; negative: string };
  elbow: { positive: string; negative: string };
  wrist: { positive: string; negative: string };
  wristRoll: { positive: string; negative: string };
  gripper: { positive: string; negative: string };
  // Speed modifier
  speedUp: string;
  speedDown: string;
  // Presets
  home: string;
  ready: string;
}

const DEFAULT_KEYBOARD_MAPPING: KeyboardMapping = {
  base: { positive: 'KeyA', negative: 'KeyD' },
  shoulder: { positive: 'KeyW', negative: 'KeyS' },
  elbow: { positive: 'KeyQ', negative: 'KeyE' },
  wrist: { positive: 'KeyR', negative: 'KeyF' },
  wristRoll: { positive: 'KeyZ', negative: 'KeyC' },
  gripper: { positive: 'KeyX', negative: 'KeyV' },
  speedUp: 'ShiftLeft',
  speedDown: 'ControlLeft',
  home: 'KeyH',
  ready: 'KeyG',
};

/**
 * Gamepad axis mapping
 */
export interface GamepadMapping {
  // Left stick
  leftStickX: keyof JointState; // typically base
  leftStickY: keyof JointState; // typically shoulder
  // Right stick
  rightStickX: keyof JointState; // typically wristRoll
  rightStickY: keyof JointState; // typically elbow
  // Triggers
  leftTrigger: keyof JointState; // typically gripper open
  rightTrigger: keyof JointState; // typically gripper close
  // Bumpers for wrist
  leftBumper: { joint: keyof JointState; direction: number };
  rightBumper: { joint: keyof JointState; direction: number };
}

const DEFAULT_GAMEPAD_MAPPING: GamepadMapping = {
  leftStickX: 'base',
  leftStickY: 'shoulder',
  rightStickX: 'wristRoll',
  rightStickY: 'elbow',
  leftTrigger: 'gripper',
  rightTrigger: 'gripper',
  leftBumper: { joint: 'wrist', direction: -1 },
  rightBumper: { joint: 'wrist', direction: 1 },
};

export interface TeleoperationConfig {
  enabled: boolean;
  inputMode: 'keyboard' | 'gamepad' | 'both';
  baseSpeed: number; // degrees per second
  maxSpeed: number;
  acceleration: number; // for smooth start/stop
  deadzone: number; // for gamepad sticks
  keyboardMapping?: KeyboardMapping;
  gamepadMapping?: GamepadMapping;
}

const DEFAULT_CONFIG: TeleoperationConfig = {
  enabled: false,
  inputMode: 'both',
  baseSpeed: 30, // degrees per second
  maxSpeed: 90,
  acceleration: 120, // degrees per second squared
  deadzone: 0.15,
};

export interface TeleoperationState {
  isActive: boolean;
  currentSpeed: number;
  activeJoints: Set<keyof JointState>;
  gamepadConnected: boolean;
  lastInput: 'keyboard' | 'gamepad' | null;
}

/**
 * Hook for keyboard-based teleoperation
 */
export function useKeyboardTeleoperation(
  joints: JointState,
  setJoints: (joints: Partial<JointState>) => void,
  limits: Record<keyof JointState, { min: number; max: number }>,
  config: Partial<TeleoperationConfig> = {}
) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const keyboardMapping = config.keyboardMapping || DEFAULT_KEYBOARD_MAPPING;

  const pressedKeys = useRef<Set<string>>(new Set());
  const velocities = useRef<Record<keyof JointState, number>>({
    base: 0,
    shoulder: 0,
    elbow: 0,
    wrist: 0,
    wristRoll: 0,
    gripper: 0,
  });
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const [state, setState] = useState<TeleoperationState>({
    isActive: false,
    currentSpeed: fullConfig.baseSpeed,
    activeJoints: new Set(),
    gamepadConnected: false,
    lastInput: null,
  });

  // Handle key down
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!fullConfig.enabled) return;
    if (e.repeat) return; // Ignore key repeat

    pressedKeys.current.add(e.code);

    // Speed modifiers
    if (e.code === keyboardMapping.speedUp) {
      setState(prev => ({
        ...prev,
        currentSpeed: Math.min(prev.currentSpeed * 1.5, fullConfig.maxSpeed),
      }));
    }
    if (e.code === keyboardMapping.speedDown) {
      setState(prev => ({
        ...prev,
        currentSpeed: Math.max(prev.currentSpeed * 0.5, fullConfig.baseSpeed / 2),
      }));
    }

    // Home position preset
    if (e.code === keyboardMapping.home) {
      setJoints({
        base: 0,
        shoulder: 0,
        elbow: 0,
        wrist: 0,
        wristRoll: 0,
        gripper: 0,
      });
    }

    // Ready position preset
    if (e.code === keyboardMapping.ready) {
      setJoints({
        base: 0,
        shoulder: -45,
        elbow: 90,
        wrist: -45,
        wristRoll: 0,
        gripper: 30,
      });
    }

    setState(prev => ({ ...prev, isActive: true, lastInput: 'keyboard' }));
  }, [fullConfig.enabled, fullConfig.baseSpeed, fullConfig.maxSpeed, keyboardMapping, setJoints]);

  // Handle key up
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    pressedKeys.current.delete(e.code);

    if (e.code === keyboardMapping.speedUp || e.code === keyboardMapping.speedDown) {
      setState(prev => ({ ...prev, currentSpeed: fullConfig.baseSpeed }));
    }

    if (pressedKeys.current.size === 0) {
      setState(prev => ({ ...prev, isActive: false }));
    }
  }, [keyboardMapping, fullConfig.baseSpeed]);

  // Animation loop for smooth movement
  const updateJoints = useCallback((timestamp: number) => {
    if (!fullConfig.enabled) {
      animationFrameRef.current = requestAnimationFrame(updateJoints);
      return;
    }

    const dt = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0;
    lastTimeRef.current = timestamp;

    if (dt <= 0 || dt > 0.1) {
      animationFrameRef.current = requestAnimationFrame(updateJoints);
      return;
    }

    const activeJoints = new Set<keyof JointState>();
    const updates: Partial<JointState> = {};

    // Process each joint
    const jointKeys: (keyof JointState)[] = ['base', 'shoulder', 'elbow', 'wrist', 'wristRoll', 'gripper'];

    for (const joint of jointKeys) {
      const mapping = keyboardMapping[joint];
      const isPositive = pressedKeys.current.has(mapping.positive);
      const isNegative = pressedKeys.current.has(mapping.negative);

      let targetVelocity = 0;
      if (isPositive && !isNegative) targetVelocity = state.currentSpeed;
      else if (isNegative && !isPositive) targetVelocity = -state.currentSpeed;

      // Smooth acceleration/deceleration
      const currentVel = velocities.current[joint];
      const velDiff = targetVelocity - currentVel;
      const maxChange = fullConfig.acceleration * dt;
      const newVel = currentVel + Math.sign(velDiff) * Math.min(Math.abs(velDiff), maxChange);
      velocities.current[joint] = newVel;

      // Apply velocity to joint
      if (Math.abs(newVel) > 0.1) {
        const newValue = joints[joint] + newVel * dt;
        const clampedValue = Math.max(limits[joint].min, Math.min(limits[joint].max, newValue));
        updates[joint] = clampedValue;
        activeJoints.add(joint);
      }
    }

    if (Object.keys(updates).length > 0) {
      setJoints(updates);
    }

    setState(prev => ({
      ...prev,
      activeJoints,
    }));

    animationFrameRef.current = requestAnimationFrame(updateJoints);
  }, [fullConfig.enabled, fullConfig.acceleration, joints, limits, setJoints, state.currentSpeed, keyboardMapping]);

  // Set up event listeners
  useEffect(() => {
    if (!fullConfig.enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    animationFrameRef.current = requestAnimationFrame(updateJoints);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [fullConfig.enabled, handleKeyDown, handleKeyUp, updateJoints]);

  return {
    state,
    config: fullConfig,
    keyboardMapping,
  };
}

/**
 * Hook for gamepad-based teleoperation
 */
export function useGamepadTeleoperation(
  joints: JointState,
  setJoints: (joints: Partial<JointState>) => void,
  limits: Record<keyof JointState, { min: number; max: number }>,
  config: Partial<TeleoperationConfig> = {}
) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const gamepadMapping = config.gamepadMapping || DEFAULT_GAMEPAD_MAPPING;

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const [state, setState] = useState<TeleoperationState>({
    isActive: false,
    currentSpeed: fullConfig.baseSpeed,
    activeJoints: new Set(),
    gamepadConnected: false,
    lastInput: null,
  });

  // Check for gamepad connection
  useEffect(() => {
    const checkGamepad = () => {
      const gamepads = navigator.getGamepads();
      const connected = gamepads.some(gp => gp !== null);
      setState(prev => ({ ...prev, gamepadConnected: connected }));
    };

    window.addEventListener('gamepadconnected', checkGamepad);
    window.addEventListener('gamepaddisconnected', checkGamepad);
    checkGamepad();

    return () => {
      window.removeEventListener('gamepadconnected', checkGamepad);
      window.removeEventListener('gamepaddisconnected', checkGamepad);
    };
  }, []);

  // Apply deadzone
  const applyDeadzone = useCallback((value: number) => {
    if (Math.abs(value) < fullConfig.deadzone) return 0;
    // Rescale to full range after deadzone
    const sign = Math.sign(value);
    return sign * (Math.abs(value) - fullConfig.deadzone) / (1 - fullConfig.deadzone);
  }, [fullConfig.deadzone]);

  // Animation loop for gamepad input
  const updateFromGamepad = useCallback((timestamp: number) => {
    if (!fullConfig.enabled || !state.gamepadConnected) {
      animationFrameRef.current = requestAnimationFrame(updateFromGamepad);
      return;
    }

    const dt = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0;
    lastTimeRef.current = timestamp;

    if (dt <= 0 || dt > 0.1) {
      animationFrameRef.current = requestAnimationFrame(updateFromGamepad);
      return;
    }

    const gamepads = navigator.getGamepads();
    const gamepad = gamepads.find(gp => gp !== null);

    if (!gamepad) {
      animationFrameRef.current = requestAnimationFrame(updateFromGamepad);
      return;
    }

    const activeJoints = new Set<keyof JointState>();
    const updates: Partial<JointState> = {};

    // Left stick
    const leftX = applyDeadzone(gamepad.axes[0]);
    const leftY = applyDeadzone(gamepad.axes[1]);

    if (leftX !== 0) {
      const joint = gamepadMapping.leftStickX;
      const change = leftX * fullConfig.baseSpeed * dt;
      const newValue = Math.max(limits[joint].min, Math.min(limits[joint].max, joints[joint] + change));
      updates[joint] = newValue;
      activeJoints.add(joint);
    }

    if (leftY !== 0) {
      const joint = gamepadMapping.leftStickY;
      const change = -leftY * fullConfig.baseSpeed * dt; // Invert Y
      const newValue = Math.max(limits[joint].min, Math.min(limits[joint].max, joints[joint] + change));
      updates[joint] = newValue;
      activeJoints.add(joint);
    }

    // Right stick
    const rightX = applyDeadzone(gamepad.axes[2]);
    const rightY = applyDeadzone(gamepad.axes[3]);

    if (rightX !== 0) {
      const joint = gamepadMapping.rightStickX;
      const change = rightX * fullConfig.baseSpeed * dt;
      const newValue = Math.max(limits[joint].min, Math.min(limits[joint].max, joints[joint] + change));
      updates[joint] = newValue;
      activeJoints.add(joint);
    }

    if (rightY !== 0) {
      const joint = gamepadMapping.rightStickY;
      const change = -rightY * fullConfig.baseSpeed * dt; // Invert Y
      const newValue = Math.max(limits[joint].min, Math.min(limits[joint].max, joints[joint] + change));
      updates[joint] = newValue;
      activeJoints.add(joint);
    }

    // Triggers for gripper (LT opens, RT closes)
    const leftTrigger = gamepad.buttons[6]?.value || 0;
    const rightTrigger = gamepad.buttons[7]?.value || 0;
    const gripperDelta = (rightTrigger - leftTrigger) * fullConfig.baseSpeed * dt;

    if (Math.abs(gripperDelta) > 0.1) {
      const newGripper = Math.max(
        limits.gripper.min,
        Math.min(limits.gripper.max, joints.gripper + gripperDelta)
      );
      updates.gripper = newGripper;
      activeJoints.add('gripper');
    }

    // Bumpers for wrist
    const leftBumper = gamepad.buttons[4]?.pressed;
    const rightBumper = gamepad.buttons[5]?.pressed;

    if (leftBumper) {
      const { joint, direction } = gamepadMapping.leftBumper;
      const change = direction * fullConfig.baseSpeed * dt * 0.5;
      const newValue = Math.max(limits[joint].min, Math.min(limits[joint].max, joints[joint] + change));
      updates[joint] = newValue;
      activeJoints.add(joint);
    }

    if (rightBumper) {
      const { joint, direction } = gamepadMapping.rightBumper;
      const change = direction * fullConfig.baseSpeed * dt * 0.5;
      const newValue = Math.max(limits[joint].min, Math.min(limits[joint].max, joints[joint] + change));
      updates[joint] = newValue;
      activeJoints.add(joint);
    }

    if (Object.keys(updates).length > 0) {
      setJoints(updates);
      setState(prev => ({
        ...prev,
        isActive: true,
        activeJoints,
        lastInput: 'gamepad',
      }));
    } else {
      setState(prev => ({
        ...prev,
        isActive: activeJoints.size > 0,
        activeJoints,
      }));
    }

    animationFrameRef.current = requestAnimationFrame(updateFromGamepad);
  }, [fullConfig, state.gamepadConnected, joints, limits, setJoints, applyDeadzone, gamepadMapping]);

  // Start animation loop
  useEffect(() => {
    if (!fullConfig.enabled) return;

    animationFrameRef.current = requestAnimationFrame(updateFromGamepad);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [fullConfig.enabled, updateFromGamepad]);

  return {
    state,
    config: fullConfig,
    gamepadMapping,
  };
}

/**
 * Combined hook for both keyboard and gamepad teleoperation
 */
export function useTeleoperation(
  joints: JointState,
  setJoints: (joints: Partial<JointState>) => void,
  limits: Record<keyof JointState, { min: number; max: number }>,
  config: Partial<TeleoperationConfig> = {}
) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  const keyboard = useKeyboardTeleoperation(joints, setJoints, limits, {
    ...fullConfig,
    enabled: fullConfig.enabled && (fullConfig.inputMode === 'keyboard' || fullConfig.inputMode === 'both'),
  });

  const gamepad = useGamepadTeleoperation(joints, setJoints, limits, {
    ...fullConfig,
    enabled: fullConfig.enabled && (fullConfig.inputMode === 'gamepad' || fullConfig.inputMode === 'both'),
  });

  // Combine states
  const isActive = keyboard.state.isActive || gamepad.state.isActive;
  const activeJoints = new Set([...keyboard.state.activeJoints, ...gamepad.state.activeJoints]);
  const lastInput = keyboard.state.lastInput || gamepad.state.lastInput;

  return {
    keyboard,
    gamepad,
    isActive,
    activeJoints,
    lastInput,
    gamepadConnected: gamepad.state.gamepadConnected,
    config: fullConfig,
  };
}

export default useTeleoperation;
