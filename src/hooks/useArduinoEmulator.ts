/**
 * React hook for Arduino emulation integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getArduinoEmulator, type ArduinoEmulatorState } from '../lib/arduinoEmulator';
import { useAppStore } from '../stores/useAppStore';

export interface UseArduinoEmulatorResult {
  state: ArduinoEmulatorState;
  isRunning: boolean;
  serialOutput: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
  loadHex: (hex: string) => boolean;
  sendSerial: (data: string) => void;
  attachServo: (pin: number) => void;
  getServoAngle: (pin: number) => number;
}

export function useArduinoEmulator(): UseArduinoEmulatorResult {
  const { setJoints } = useAppStore();

  const emulator = useRef(getArduinoEmulator());
  const [state, setState] = useState<ArduinoEmulatorState>({
    running: false,
    cycleCount: 0,
    serialOutput: '',
    pinStates: {},
    pwmValues: {},
  });
  const [serialOutput, setSerialOutput] = useState('');

  // Setup emulator callbacks
  useEffect(() => {
    const emu = emulator.current;

    // Handle serial output
    emu.onSerial((char) => {
      setSerialOutput((prev) => {
        const newOutput = prev + char;
        // Keep only last 1000 characters
        return newOutput.slice(-1000);
      });
    });

    // Handle servo changes - map to robot joints
    emu.onServo((pin, angle) => {
      // Map Arduino servo pins to robot joints
      // This mapping can be customized based on the robot configuration
      const jointMapping: Record<number, string> = {
        3: 'base',      // Pin 3 -> base rotation
        5: 'shoulder',  // Pin 5 -> shoulder
        6: 'elbow',     // Pin 6 -> elbow
        9: 'wrist',     // Pin 9 -> wrist
        10: 'gripper',  // Pin 10 -> gripper
      };

      const jointName = jointMapping[pin];
      if (jointName) {
        // Convert servo angle (0-180) to joint angle
        let jointAngle: number;
        if (jointName === 'gripper') {
          // Gripper is 0-100
          jointAngle = (angle / 180) * 100;
        } else if (jointName === 'base') {
          // Base is -135 to 135
          jointAngle = (angle - 90) * 1.5;
        } else {
          // Other joints are typically -90 to 90
          jointAngle = angle - 90;
        }

        setJoints({ [jointName]: jointAngle });
      }
    });

    // Update state periodically
    const interval = setInterval(() => {
      setState(emu.getState());
    }, 100);

    return () => {
      clearInterval(interval);
      emu.stop();
    };
  }, [setJoints]);

  const start = useCallback(() => {
    emulator.current.start();
    setState(emulator.current.getState());
  }, []);

  const stop = useCallback(() => {
    emulator.current.stop();
    setState(emulator.current.getState());
  }, []);

  const reset = useCallback(() => {
    emulator.current.reset();
    setSerialOutput('');
    setState(emulator.current.getState());
  }, []);

  const loadHex = useCallback((hex: string): boolean => {
    const success = emulator.current.loadHex(hex);
    if (success) {
      setSerialOutput('');
      setState(emulator.current.getState());
    }
    return success;
  }, []);

  const sendSerial = useCallback((data: string) => {
    emulator.current.sendSerial(data);
  }, []);

  const attachServo = useCallback((pin: number) => {
    emulator.current.attachServo(pin);
  }, []);

  const getServoAngle = useCallback((pin: number): number => {
    return emulator.current.getServoAngle(pin);
  }, []);

  return {
    state,
    isRunning: state.running,
    serialOutput,
    start,
    stop,
    reset,
    loadHex,
    sendSerial,
    attachServo,
    getServoAngle,
  };
}
