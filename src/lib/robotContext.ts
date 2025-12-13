/**
 * Robot Context - Centralized state aggregation with event bus
 * Provides bidirectional communication between LLM and robot
 */

import type {
  JointState,
  WheeledRobotState,
  DroneState,
  HumanoidState,
  ActiveRobotType,
  SensorReading
} from '../types';

// Event types that the robot can emit
export type RobotEventType =
  | 'motion_started'
  | 'motion_completed'
  | 'motion_cancelled'
  | 'target_reached'
  | 'collision_detected'
  | 'limit_reached'
  | 'gripper_opened'
  | 'gripper_closed'
  | 'object_grasped'
  | 'object_released'
  | 'sensor_triggered'
  | 'error'
  | 'idle'
  | 'task_started'
  | 'task_completed'
  | 'task_failed';

export interface RobotEvent {
  type: RobotEventType;
  timestamp: Date;
  details?: string;
  data?: Record<string, unknown>;
}

export interface RobotContextState {
  // Current robot type
  robotType: ActiveRobotType;

  // Robot state based on type
  armState?: JointState;
  wheeledState?: WheeledRobotState;
  droneState?: DroneState;
  humanoidState?: HumanoidState;

  // Sensors
  sensors: SensorReading;

  // Status
  isMoving: boolean;
  isExecutingTask: boolean;
  currentTask?: string;
  lastAction?: string;
  lastActionTime?: Date;

  // Events history (last 10)
  recentEvents: RobotEvent[];

  // Computed values for arm
  endEffectorPosition?: { x: number; y: number; z: number };
  gripperState?: 'open' | 'closed' | 'partial';
}

type EventCallback = (event: RobotEvent) => void;

class RobotContextManager {
  private state: RobotContextState;
  private listeners = new Map<string, EventCallback[]>();
  private allListeners: EventCallback[] = [];

  constructor() {
    this.state = {
      robotType: 'arm',
      sensors: {
        ultrasonic: 25.0,
        leftIR: false,
        centerIR: false,
        rightIR: false,
        leftMotor: 0,
        rightMotor: 0,
        battery: 100,
      },
      isMoving: false,
      isExecutingTask: false,
      recentEvents: [],
    };
  }

  // Update state from store
  updateFromStore(
    robotType: ActiveRobotType,
    joints: JointState,
    wheeled: WheeledRobotState,
    drone: DroneState,
    humanoid: HumanoidState,
    sensors: SensorReading,
    isAnimating: boolean
  ): void {
    const wasMoving = this.state.isMoving;

    this.state = {
      ...this.state,
      robotType,
      armState: robotType === 'arm' ? joints : undefined,
      wheeledState: robotType === 'wheeled' ? wheeled : undefined,
      droneState: robotType === 'drone' ? drone : undefined,
      humanoidState: robotType === 'humanoid' ? humanoid : undefined,
      sensors,
      isMoving: isAnimating,
    };

    // Compute gripper state for arm
    if (robotType === 'arm' && joints) {
      this.state.gripperState =
        joints.gripper > 80 ? 'open' :
        joints.gripper < 20 ? 'closed' : 'partial';
    }

    // Emit events for state changes
    if (wasMoving && !isAnimating) {
      this.emit({ type: 'motion_completed', timestamp: new Date() });
    } else if (!wasMoving && isAnimating) {
      this.emit({ type: 'motion_started', timestamp: new Date() });
    }
  }

  // Emit an event
  emit(event: RobotEvent): void {
    // Add to recent events (keep last 10)
    this.state.recentEvents = [
      event,
      ...this.state.recentEvents.slice(0, 9)
    ];

    // Notify specific listeners
    const typeListeners = this.listeners.get(event.type) || [];
    typeListeners.forEach(cb => cb(event));

    // Notify all-event listeners
    this.allListeners.forEach(cb => cb(event));
  }

  // Subscribe to specific event type
  on(eventType: RobotEventType, callback: EventCallback): () => void {
    const listeners = this.listeners.get(eventType) || [];
    listeners.push(callback);
    this.listeners.set(eventType, listeners);

    // Return unsubscribe function
    return () => {
      const updated = this.listeners.get(eventType)?.filter(cb => cb !== callback) || [];
      this.listeners.set(eventType, updated);
    };
  }

  // Subscribe to all events
  onAny(callback: EventCallback): () => void {
    this.allListeners.push(callback);
    return () => {
      this.allListeners = this.allListeners.filter(cb => cb !== callback);
    };
  }

  // Get current state
  getState(): RobotContextState {
    return { ...this.state };
  }

  // Task tracking
  startTask(taskName: string): void {
    this.state.isExecutingTask = true;
    this.state.currentTask = taskName;
    this.emit({
      type: 'task_started',
      timestamp: new Date(),
      details: taskName
    });
  }

  completeTask(result?: string): void {
    const taskName = this.state.currentTask;
    this.state.isExecutingTask = false;
    this.state.currentTask = undefined;
    this.state.lastAction = taskName;
    this.state.lastActionTime = new Date();
    this.emit({
      type: 'task_completed',
      timestamp: new Date(),
      details: result || taskName
    });
  }

  failTask(reason: string): void {
    this.state.isExecutingTask = false;
    this.state.currentTask = undefined;
    this.emit({
      type: 'task_failed',
      timestamp: new Date(),
      details: reason
    });
  }

  // Record action for context
  recordAction(action: string): void {
    this.state.lastAction = action;
    this.state.lastActionTime = new Date();
  }
}

// Singleton instance
export const robotContext = new RobotContextManager();
