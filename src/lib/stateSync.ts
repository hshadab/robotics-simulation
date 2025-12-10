/**
 * State Synchronization Utility
 *
 * Handles synchronization between IndexedDB and localStorage to prevent
 * data inconsistencies. Implements conflict resolution and versioning.
 */

import { loggers } from './logger';
import { STORAGE_CONFIG } from './config';

const log = loggers.state;

export interface SyncMeta {
  version: number;
  lastModified: number;
  checksum: string;
}

export interface SyncableState<T> {
  data: T;
  meta: SyncMeta;
}

/**
 * Calculate a simple checksum for state data
 */
function calculateChecksum(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * State Synchronizer class
 *
 * Manages synchronized state between localStorage (fast) and IndexedDB (reliable).
 */
export class StateSynchronizer<T> {
  private readonly storageKey: string;
  private readonly dbName: string;
  private readonly storeName: string;
  private db: IDBDatabase | null = null;
  private version: number = 0;
  private pendingWrites: Map<string, T> = new Map();
  private syncInProgress: boolean = false;

  constructor(options: {
    storageKey: string;
    dbName?: string;
    storeName?: string;
  }) {
    this.storageKey = options.storageKey;
    this.dbName = options.dbName || STORAGE_CONFIG.DB_NAME;
    this.storeName = options.storeName || STORAGE_CONFIG.DB_STORE;
  }

  /**
   * Initialize the synchronizer
   */
  async init(): Promise<void> {
    try {
      this.db = await this.openDatabase();
      await this.reconcile();
      log.debug('State synchronizer initialized', { key: this.storageKey });
    } catch (error) {
      log.error('Failed to initialize state synchronizer', error);
    }
  }

  /**
   * Open IndexedDB database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Save state with synchronization
   */
  async save(id: string, data: T): Promise<void> {
    const meta: SyncMeta = {
      version: ++this.version,
      lastModified: Date.now(),
      checksum: calculateChecksum(data),
    };

    const syncableState: SyncableState<T> = { data, meta };

    // Save to localStorage first (fast)
    try {
      const localKey = `${this.storageKey}_${id}`;
      localStorage.setItem(localKey, JSON.stringify(syncableState));
    } catch (error) {
      log.warn('Failed to save to localStorage, using IndexedDB only', error);
    }

    // Queue IndexedDB write
    this.pendingWrites.set(id, data);
    await this.flushPendingWrites();
  }

  /**
   * Load state with fallback
   */
  async load(id: string): Promise<T | null> {
    // Try localStorage first (fast)
    const localKey = `${this.storageKey}_${id}`;
    const localData = localStorage.getItem(localKey);

    let localState: SyncableState<T> | null = null;
    if (localData) {
      try {
        localState = JSON.parse(localData);
      } catch {
        log.warn('Failed to parse localStorage state');
      }
    }

    // Try IndexedDB
    const dbState = await this.loadFromDB(id);

    // Resolve conflicts
    if (localState && dbState) {
      // Use the one with higher version
      if (dbState.meta.version > localState.meta.version) {
        // Update localStorage with DB data
        localStorage.setItem(localKey, JSON.stringify(dbState));
        return dbState.data;
      } else if (localState.meta.version > dbState.meta.version) {
        // Update DB with localStorage data
        await this.saveToDB(id, localState);
        return localState.data;
      } else {
        // Same version, verify checksums
        if (localState.meta.checksum !== dbState.meta.checksum) {
          // Conflict! Use the most recently modified
          log.warn('State conflict detected, resolving by timestamp', { id });
          if (localState.meta.lastModified > dbState.meta.lastModified) {
            await this.saveToDB(id, localState);
            return localState.data;
          } else {
            localStorage.setItem(localKey, JSON.stringify(dbState));
            return dbState.data;
          }
        }
        return localState.data;
      }
    }

    // Return whichever exists
    if (localState) return localState.data;
    if (dbState) return dbState.data;

    return null;
  }

  /**
   * Load from IndexedDB
   */
  private loadFromDB(id: string): Promise<SyncableState<T> | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save to IndexedDB
   */
  private saveToDB(id: string, state: SyncableState<T>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put({ id, ...state });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Flush pending writes to IndexedDB
   */
  private async flushPendingWrites(): Promise<void> {
    if (this.syncInProgress || this.pendingWrites.size === 0) return;

    this.syncInProgress = true;

    try {
      const writes = Array.from(this.pendingWrites.entries());
      this.pendingWrites.clear();

      for (const [id] of writes) {
        const localKey = `${this.storageKey}_${id}`;
        const localData = localStorage.getItem(localKey);
        if (localData) {
          const state: SyncableState<T> = JSON.parse(localData);
          await this.saveToDB(id, state);
        }
      }
    } catch (error) {
      log.error('Failed to flush pending writes', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Reconcile localStorage and IndexedDB on startup
   */
  private async reconcile(): Promise<void> {
    // Find all local storage keys matching our pattern
    const prefix = `${this.storageKey}_`;
    const localKeys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        localKeys.push(key.slice(prefix.length));
      }
    }

    // Load and verify each
    for (const id of localKeys) {
      await this.load(id);
    }

    log.debug('State reconciliation complete', { keysProcessed: localKeys.length });
  }

  /**
   * Delete state from both storages
   */
  async delete(id: string): Promise<void> {
    // Remove from localStorage
    const localKey = `${this.storageKey}_${id}`;
    localStorage.removeItem(localKey);

    // Remove from IndexedDB
    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * Create a synchronized state instance
 */
export function createSyncedState<T>(key: string): StateSynchronizer<T> {
  return new StateSynchronizer<T>({ storageKey: key });
}
