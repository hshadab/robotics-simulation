import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../stores/useAppStore';
import type { SimObject } from '../types';
import { calculateSO101GripperPosition } from '../components/simulation/SO101Kinematics';

// Threshold for position updates (to avoid infinite loops)
const POSITION_THRESHOLD = 0.001;

// Calculate distance between two 3D points
const distance3D = (
  a: [number, number, number],
  b: [number, number, number]
): number => {
  return Math.sqrt(
    Math.pow(a[0] - b[0], 2) +
    Math.pow(a[1] - b[1], 2) +
    Math.pow(a[2] - b[2], 2)
  );
};

// Check if object is in target zone
const isInZone = (
  objPos: [number, number, number],
  zonePos: [number, number, number],
  zoneSize: [number, number, number]
): boolean => {
  return (
    Math.abs(objPos[0] - zonePos[0]) < zoneSize[0] / 2 &&
    Math.abs(objPos[2] - zonePos[2]) < zoneSize[2] / 2
  );
};

export const useGripperInteraction = () => {
  // Use selectors to avoid unnecessary re-renders
  const joints = useAppStore((state) => state.joints);
  const updateObject = useAppStore((state) => state.updateObject);
  const completeObjective = useAppStore((state) => state.completeObjective);

  const prevGripperRef = useRef(joints.gripper);
  const grabbedObjectIdRef = useRef<string | null>(null);
  const lastPositionRef = useRef<[number, number, number]>([0, 0, 0]);

  // Check if position changed significantly
  const positionChanged = useCallback((newPos: [number, number, number], oldPos: [number, number, number]) => {
    return (
      Math.abs(newPos[0] - oldPos[0]) > POSITION_THRESHOLD ||
      Math.abs(newPos[1] - oldPos[1]) > POSITION_THRESHOLD ||
      Math.abs(newPos[2] - oldPos[2]) > POSITION_THRESHOLD
    );
  }, []);

  useEffect(() => {
    // Get current state directly from store to avoid dependency issues
    const { objects, targetZones, challengeState } = useAppStore.getState();

    const gripperPos = calculateSO101GripperPosition(joints);
    const gripperClosed = joints.gripper < 30;
    const wasClosing = prevGripperRef.current >= 30 && joints.gripper < 30;
    const wasOpening = prevGripperRef.current <= 70 && joints.gripper > 70;

    // Check for grabbing (gripper just closed)
    if (wasClosing && !grabbedObjectIdRef.current) {
      // Find closest grabbable object within reach
      let closestObj: SimObject | null = null;
      let closestDist = Infinity;
      const grabRadius = 0.1; // 10cm grab radius for easier grabbing

      for (const obj of objects) {
        if (obj.isGrabbable && !obj.isGrabbed) {
          const dist = distance3D(gripperPos, obj.position);
          if (dist < grabRadius && dist < closestDist) {
            closestObj = obj;
            closestDist = dist;
          }
        }
      }

      if (closestObj) {
        grabbedObjectIdRef.current = closestObj.id;
        updateObject(closestObj.id, { isGrabbed: true });
      }
    }

    // Check for releasing (gripper just opened)
    if (wasOpening && grabbedObjectIdRef.current) {
      const releasedId = grabbedObjectIdRef.current;
      const releasedObj = objects.find((o) => o.id === releasedId);

      if (releasedObj) {
        // Calculate drop position (current gripper position, but on the ground)
        const dropPos: [number, number, number] = [
          gripperPos[0],
          releasedObj.scale / 2 + 0.001, // Place on ground based on object size
          gripperPos[2],
        ];

        // Check if dropped in a target zone
        let inTargetZone = false;
        for (const zone of targetZones) {
          if (zone.acceptedObjectIds.includes(releasedId) && isInZone(dropPos, zone.position, zone.size)) {
            inTargetZone = true;

            // Check challenge objectives
            if (challengeState.activeChallenge) {
              for (const obj of challengeState.activeChallenge.objectives) {
                if (
                  !obj.isCompleted &&
                  obj.type === 'move_object' &&
                  obj.target?.objectId === releasedId &&
                  obj.target?.zoneId === zone.id
                ) {
                  completeObjective(obj.id);
                }
              }
            }
            break;
          }
        }

        updateObject(releasedId, {
          isGrabbed: false,
          position: dropPos,
          isInTargetZone: inTargetZone,
        });
      }

      grabbedObjectIdRef.current = null;
    }

    // Update grabbed object position to follow gripper (only if position changed)
    if (grabbedObjectIdRef.current && gripperClosed) {
      // Position object slightly below gripper
      const objPos: [number, number, number] = [
        gripperPos[0],
        gripperPos[1] - 0.02,
        gripperPos[2],
      ];

      // Only update if position actually changed
      if (positionChanged(objPos, lastPositionRef.current)) {
        lastPositionRef.current = objPos;
        updateObject(grabbedObjectIdRef.current, { position: objPos });
      }
    }

    prevGripperRef.current = joints.gripper;
  }, [joints, updateObject, completeObjective, positionChanged]);

  return null;
};
