import { useCallback, useRef } from 'react';
import { useAppStore } from '../stores/useAppStore';
import type { JointState, ActiveRobotType, WheeledRobotState, DroneState, HumanoidState } from '../types';
import { callClaudeAPI, getClaudeApiKey } from '../lib/claudeApi';

// System prompts for different robot types
export const SYSTEM_PROMPTS: Record<ActiveRobotType, string> = {
  arm: `You are a robot arm controller for the Hiwonder xArm 1S, a 6-servo desktop robot arm made of aluminum alloy.

HARDWARE SPECIFICATIONS:
- Base rotation: -135° to +135° (0° = forward)
- Shoulder: -90° to +90° (0° = horizontal, positive = up)
- Elbow: -135° to +45° (0° = straight, negative = fold up)
- Wrist: -90° to +90° (0° = aligned with forearm)
- Gripper: 0 (closed) to 100 (fully open)

Respond with JSON for movements and sequences.`,

  wheeled: `You are a controller for a differential drive wheeled robot with ultrasonic and IR sensors.

HARDWARE SPECIFICATIONS:
- Left/Right motor speed: -255 to +255 (negative = reverse)
- Servo head: -90° to +90° (for ultrasonic sensor pan)
- Ultrasonic range: 2cm to 400cm
- 3 IR line sensors (left, center, right)

Commands: forward, backward, turn left/right, spin, follow line, avoid obstacles.`,

  drone: `You are a controller for a mini quadcopter drone with altitude hold capability.

HARDWARE SPECIFICATIONS:
- Throttle: 0% to 100%
- Roll/Pitch: -45° to +45°
- Yaw: -180° to +180°
- Flight modes: stabilize, altitude_hold, position_hold, land

Commands: takeoff, land, hover, fly direction, rotate, flip.`,

  humanoid: `You are a controller for the Berkeley Humanoid Lite, a 22-DOF bipedal humanoid robot.

HARDWARE SPECIFICATIONS:
- Height: 0.8m, Weight: 16kg
- Legs: 6 DOF each (hip pitch/roll/yaw, knee, ankle pitch/roll)
- Arms: 5 DOF each (shoulder pitch/roll/yaw, elbow, wrist)
- Joint ranges: typically -90° to +90° depending on joint

Commands: walk forward, wave, squat, raise arms, stand on one leg, reset pose.`,
};

export const useLLMChat = () => {
  const {
    joints,
    addMessage,
    setLLMLoading,
    setJoints,
    setIsAnimating,
    setCode,
    activeRobotType,
    wheeledRobot,
    setWheeledRobot,
    drone,
    setDrone,
    humanoid,
    setHumanoid,
  } = useAppStore();

  const jointsRef = useRef<JointState>(joints);
  jointsRef.current = joints;

  const wheeledRef = useRef<WheeledRobotState>(wheeledRobot);
  wheeledRef.current = wheeledRobot;

  const droneRef = useRef<DroneState>(drone);
  droneRef.current = drone;

  const humanoidRef = useRef<HumanoidState>(humanoid);
  humanoidRef.current = humanoid;

  const animateToJoints = useCallback(
    (targetJoints: Partial<JointState>, duration = 600): Promise<void> => {
      return new Promise((resolve) => {
        const startJoints = { ...jointsRef.current };
        const startTime = Date.now();

        const animate = () => {
          const progress = Math.min((Date.now() - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);

          const newJoints: Partial<JointState> = {};
          for (const joint of Object.keys(startJoints) as (keyof JointState)[]) {
            if (targetJoints[joint] !== undefined) {
              newJoints[joint] =
                startJoints[joint] +
                ((targetJoints[joint] as number) - startJoints[joint]) * eased;
            }
          }

          setJoints(newJoints);

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            resolve();
          }
        };

        animate();
      });
    },
    [setJoints]
  );

  const executeArmSequence = useCallback(
    async (sequence: Array<Record<string, number | string>>) => {
      setIsAnimating(true);
      let currentJoints = { ...jointsRef.current };

      for (const step of sequence) {
        const targetJoints: Partial<JointState> = {};

        for (const [joint, value] of Object.entries(step)) {
          const jointKey = joint as keyof JointState;
          if (typeof value === 'string') {
            if (value.startsWith('+') || value.startsWith('-')) {
              targetJoints[jointKey] = currentJoints[jointKey] + parseFloat(value);
            }
          } else if (typeof value === 'number') {
            targetJoints[jointKey] = value;
          }
        }

        await animateToJoints(targetJoints, 500);
        currentJoints = { ...currentJoints, ...targetJoints };
        await new Promise((r) => setTimeout(r, 100));
      }

      setIsAnimating(false);
    },
    [animateToJoints, setIsAnimating]
  );

  const executeWheeledAction = useCallback(
    async (action: Partial<WheeledRobotState>, duration = 1000) => {
      setIsAnimating(true);
      setWheeledRobot(action);
      await new Promise((r) => setTimeout(r, duration));
      setIsAnimating(false);
    },
    [setWheeledRobot, setIsAnimating]
  );

  const executeDroneAction = useCallback(
    async (action: Partial<DroneState>, duration = 1000) => {
      setIsAnimating(true);
      setDrone(action);
      await new Promise((r) => setTimeout(r, duration));
      setIsAnimating(false);
    },
    [setDrone, setIsAnimating]
  );

  const executeHumanoidAction = useCallback(
    async (action: Partial<HumanoidState>, duration = 1000) => {
      setIsAnimating(true);
      setHumanoid(action);
      await new Promise((r) => setTimeout(r, duration));
      setIsAnimating(false);
    },
    [setHumanoid, setIsAnimating]
  );

  const sendMessage = useCallback(
    async (message: string) => {
      addMessage({ role: 'user', content: message });
      setLLMLoading(true);

      try {
        // Get current state based on robot type
        let currentState: JointState | WheeledRobotState | DroneState | HumanoidState;
        switch (activeRobotType) {
          case 'wheeled':
            currentState = wheeledRef.current;
            break;
          case 'drone':
            currentState = droneRef.current;
            break;
          case 'humanoid':
            currentState = humanoidRef.current;
            break;
          default:
            currentState = jointsRef.current;
        }

        // Use Claude API (falls back to simulation if no API key)
        const apiKey = getClaudeApiKey();
        const response = await callClaudeAPI(message, activeRobotType, currentState, apiKey || undefined);

        if (response.action === 'error') {
          addMessage({
            role: 'assistant',
            content: response.description || 'I could not understand that command.',
            isError: true,
          });
        } else {
          addMessage({
            role: 'assistant',
            content: response.description,
            codeGenerated: response.code,
          });

          if (response.code) {
            setCode({ source: response.code, isGenerated: true });
          }

          // Execute movements based on robot type
          if (activeRobotType === 'arm' && response.joints) {
            const sequence = Array.isArray(response.joints)
              ? response.joints
              : [response.joints];
            await executeArmSequence(sequence);
          } else if (activeRobotType === 'wheeled' && response.wheeledAction) {
            await executeWheeledAction(response.wheeledAction, response.duration);
          } else if (activeRobotType === 'drone' && response.droneAction) {
            await executeDroneAction(response.droneAction, response.duration);
          } else if (activeRobotType === 'humanoid' && response.humanoidAction) {
            await executeHumanoidAction(response.humanoidAction, response.duration);
          }
        }
      } catch (error) {
        addMessage({
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          isError: true,
        });
      } finally {
        setLLMLoading(false);
      }
    },
    [addMessage, setLLMLoading, executeArmSequence, executeWheeledAction, executeDroneAction, executeHumanoidAction, setCode, activeRobotType]
  );

  return { sendMessage };
};
