/**
 * useRobotContext Hook
 * Syncs app store with robot context and provides semantic state
 */

import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { robotContext, type RobotEvent, type RobotEventType } from '../lib/robotContext';
import { generateSemanticState, generateBriefStatus } from '../lib/semanticState';

export function useRobotContext() {
  const {
    activeRobotType,
    joints,
    wheeledRobot,
    drone,
    humanoid,
    sensors,
    isAnimating,
  } = useAppStore();

  // Sync store state to robot context
  useEffect(() => {
    robotContext.updateFromStore(
      activeRobotType,
      joints,
      wheeledRobot,
      drone,
      humanoid,
      sensors,
      isAnimating
    );
  }, [activeRobotType, joints, wheeledRobot, drone, humanoid, sensors, isAnimating]);

  // Generate semantic state for LLM
  const getSemanticState = useCallback(() => {
    return generateSemanticState(
      activeRobotType,
      joints,
      wheeledRobot,
      drone,
      humanoid,
      sensors,
      isAnimating
    );
  }, [activeRobotType, joints, wheeledRobot, drone, humanoid, sensors, isAnimating]);

  // Generate brief status
  const getBriefStatus = useCallback(() => {
    return generateBriefStatus(activeRobotType, joints, isAnimating);
  }, [activeRobotType, joints, isAnimating]);

  // Subscribe to events
  const subscribeToEvent = useCallback((
    eventType: RobotEventType,
    callback: (event: RobotEvent) => void
  ) => {
    return robotContext.on(eventType, callback);
  }, []);

  // Subscribe to all events
  const subscribeToAllEvents = useCallback((
    callback: (event: RobotEvent) => void
  ) => {
    return robotContext.onAny(callback);
  }, []);

  // Emit event
  const emitEvent = useCallback((event: Omit<RobotEvent, 'timestamp'>) => {
    robotContext.emit({ ...event, timestamp: new Date() });
  }, []);

  // Task tracking
  const startTask = useCallback((taskName: string) => {
    robotContext.startTask(taskName);
  }, []);

  const completeTask = useCallback((result?: string) => {
    robotContext.completeTask(result);
  }, []);

  const failTask = useCallback((reason: string) => {
    robotContext.failTask(reason);
  }, []);

  // Record action
  const recordAction = useCallback((action: string) => {
    robotContext.recordAction(action);
  }, []);

  return {
    // State accessors
    getSemanticState,
    getBriefStatus,
    getContext: () => robotContext.getState(),

    // Event system
    subscribeToEvent,
    subscribeToAllEvents,
    emitEvent,

    // Task tracking
    startTask,
    completeTask,
    failTask,
    recordAction,

    // Current status
    isMoving: isAnimating,
    robotType: activeRobotType,
  };
}

/**
 * Hook to listen for robot events and add them to chat
 */
export function useRobotEventMessages() {
  const { addMessage } = useAppStore();
  const [recentEvents, setRecentEvents] = useState<RobotEvent[]>([]);

  useEffect(() => {
    // Subscribe to relevant events
    const unsubscribe = robotContext.onAny((event) => {
      // Filter to important events that should show in chat
      const chatEvents: RobotEventType[] = [
        'task_completed',
        'task_failed',
        'collision_detected',
        'error',
        'object_grasped',
        'object_released',
      ];

      if (chatEvents.includes(event.type)) {
        // Add as system message in chat
        const messages: Record<string, string> = {
          task_completed: `Task completed: ${event.details || 'Done'}`,
          task_failed: `Task failed: ${event.details || 'Unknown error'}`,
          collision_detected: 'Warning: Collision detected!',
          error: `Error: ${event.details || 'Unknown error'}`,
          object_grasped: 'Object grasped successfully.',
          object_released: 'Object released.',
        };

        const content = messages[event.type] || event.type;
        addMessage({
          role: 'system',
          content: `🤖 ${content}`,
        });
      }

      // Track recent events
      setRecentEvents(prev => [event, ...prev.slice(0, 9)]);
    });

    return unsubscribe;
  }, [addMessage]);

  return recentEvents;
}
