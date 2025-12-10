/**
 * State Persistence Library
 *
 * Save and load simulation state using localStorage and IndexedDB.
 * Supports multiple named save slots and auto-save functionality.
 */

import type {
  JointState,
  EnvironmentType,
  SimObject,
  WheeledRobotState,
  DroneState,
  HumanoidState,
  ActiveRobotType,
} from '../types';
import { generateSecureId } from './crypto';
import { STORAGE_CONFIG } from './config';
import { loggers } from './logger';

const log = loggers.state;

// Saved state interface
export interface SavedState {
  id: string;
  name: string;
  timestamp: number;
  version: string;
  robotId: string;
  robotType: ActiveRobotType;
  joints: JointState;
  wheeledRobot?: WheeledRobotState;
  drone?: DroneState;
  humanoid?: HumanoidState;
  environment: EnvironmentType;
  objects: SimObject[];
  codeContent?: string;
}

// Save slot metadata (stored in localStorage)
export interface SaveSlotMeta {
  id: string;
  name: string;
  timestamp: number;
  robotId: string;
  robotType: ActiveRobotType;
  preview?: string; // Screenshot thumbnail base64
}

/**
 * Open IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORAGE_CONFIG.DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORAGE_CONFIG.DB_STORE)) {
        db.createObjectStore(STORAGE_CONFIG.DB_STORE, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Get all save slot metadata from localStorage
 */
export function getSaveSlots(): SaveSlotMeta[] {
  try {
    const stored = localStorage.getItem(STORAGE_CONFIG.KEYS.SAVE_SLOTS);
    if (!stored) return [];
    return JSON.parse(stored) as SaveSlotMeta[];
  } catch {
    return [];
  }
}

/**
 * Update save slot metadata
 */
function updateSlotMeta(slots: SaveSlotMeta[]): void {
  localStorage.setItem(STORAGE_CONFIG.KEYS.SAVE_SLOTS, JSON.stringify(slots));
}

/**
 * Save state to IndexedDB
 */
export async function saveState(
  state: Omit<SavedState, 'id' | 'timestamp' | 'version' | 'name'>,
  name: string,
  slotId?: string
): Promise<string> {
  const db = await openDatabase();

  const savedState: SavedState = {
    ...state,
    id: slotId || generateSecureId('save'),
    name,
    timestamp: Date.now(),
    version: STORAGE_CONFIG.STORAGE_VERSION,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORAGE_CONFIG.DB_STORE], 'readwrite');
    const store = transaction.objectStore(STORAGE_CONFIG.DB_STORE);

    const request = store.put(savedState);

    request.onsuccess = () => {
      // Update metadata
      const slots = getSaveSlots();
      const existingIndex = slots.findIndex(s => s.id === savedState.id);

      const meta: SaveSlotMeta = {
        id: savedState.id,
        name: savedState.name,
        timestamp: savedState.timestamp,
        robotId: savedState.robotId,
        robotType: savedState.robotType,
      };

      if (existingIndex >= 0) {
        slots[existingIndex] = meta;
      } else {
        // Add new slot, remove oldest if over limit
        slots.unshift(meta);
        if (slots.length > STORAGE_CONFIG.MAX_SAVE_SLOTS) {
          const removed = slots.pop();
          if (removed) {
            deleteState(removed.id).catch(err => log.error('Failed to delete old save slot', err));
          }
        }
      }

      updateSlotMeta(slots);
      resolve(savedState.id);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Load state from IndexedDB
 */
export async function loadState(slotId: string): Promise<SavedState | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORAGE_CONFIG.DB_STORE], 'readonly');
    const store = transaction.objectStore(STORAGE_CONFIG.DB_STORE);

    const request = store.get(slotId);

    request.onsuccess = () => {
      resolve(request.result as SavedState | null);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete state from IndexedDB
 */
export async function deleteState(slotId: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORAGE_CONFIG.DB_STORE], 'readwrite');
    const store = transaction.objectStore(STORAGE_CONFIG.DB_STORE);

    const request = store.delete(slotId);

    request.onsuccess = () => {
      // Update metadata
      const slots = getSaveSlots().filter(s => s.id !== slotId);
      updateSlotMeta(slots);
      resolve();
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Auto-save current state (quick save to localStorage)
 */
export function autoSave(state: Omit<SavedState, 'id' | 'timestamp' | 'version' | 'name'>): void {
  try {
    const savedState: SavedState = {
      ...state,
      id: 'autosave',
      name: 'Auto-save',
      timestamp: Date.now(),
      version: STORAGE_CONFIG.STORAGE_VERSION,
    };
    localStorage.setItem(STORAGE_CONFIG.KEYS.AUTOSAVE, JSON.stringify(savedState));
  } catch (e) {
    log.warn('Auto-save failed', e);
  }
}

/**
 * Load auto-save state
 */
export function loadAutoSave(): SavedState | null {
  try {
    const stored = localStorage.getItem(STORAGE_CONFIG.KEYS.AUTOSAVE);
    if (!stored) return null;
    return JSON.parse(stored) as SavedState;
  } catch {
    return null;
  }
}

/**
 * Clear auto-save
 */
export function clearAutoSave(): void {
  localStorage.removeItem(STORAGE_CONFIG.KEYS.AUTOSAVE);
}

/**
 * Check if auto-save exists
 */
export function hasAutoSave(): boolean {
  return localStorage.getItem(STORAGE_CONFIG.KEYS.AUTOSAVE) !== null;
}

/**
 * Export state as JSON file
 */
export function exportStateToFile(state: SavedState): void {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `robosim-${state.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import state from JSON file
 */
export function importStateFromFile(file: File): Promise<SavedState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const state = JSON.parse(content) as SavedState;

        // Validate required fields
        if (!state.robotId || !state.joints || !state.environment) {
          throw new Error('Invalid save file format');
        }

        // Generate new ID to avoid conflicts
        state.id = generateSecureId('save');
        state.timestamp = Date.now();

        resolve(state);
      } catch {
        reject(new Error('Failed to parse save file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Auto-save manager class with proper cleanup
 */
export class AutoSaveManager {
  private intervalId: number | null = null;
  private getState: () => Omit<SavedState, 'id' | 'timestamp' | 'version' | 'name'>;
  private enabled: boolean = false;

  constructor(
    getState: () => Omit<SavedState, 'id' | 'timestamp' | 'version' | 'name'>
  ) {
    this.getState = getState;
  }

  start(intervalMs: number = STORAGE_CONFIG.AUTOSAVE_INTERVAL_MS): void {
    if (this.intervalId) this.stop();

    this.enabled = true;
    this.intervalId = window.setInterval(() => {
      if (this.enabled) {
        autoSave(this.getState());
      }
    }, intervalMs);

    // Initial save
    autoSave(this.getState());
    log.debug('Auto-save manager started', { intervalMs });
  }

  stop(): void {
    this.enabled = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      log.debug('Auto-save manager stopped');
    }
  }

  saveNow(): void {
    autoSave(this.getState());
  }

  isRunning(): boolean {
    return this.enabled && this.intervalId !== null;
  }

  /** Cleanup method for use in useEffect cleanup */
  destroy(): void {
    this.stop();
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

/**
 * Get storage usage info
 */
export function getStorageInfo(): { used: number; available: number } {
  let used = 0;

  // Calculate localStorage usage
  for (const key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      used += localStorage.getItem(key)?.length || 0;
    }
  }

  // Calculate available space based on configured limit
  const available = STORAGE_CONFIG.MAX_LOCAL_STORAGE_SIZE - used;

  return { used, available: Math.max(0, available) };
}
