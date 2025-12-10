/**
 * Chunked Episode Recorder
 *
 * Records episodes in memory-efficient chunks to prevent browser crashes
 * when recording large datasets. Supports streaming export.
 */

import type { Episode } from './datasetExporter';
import { EPISODE_CONFIG } from './config';
import { generateSecureId } from './crypto';
import { loggers } from './logger';

const log = loggers.dataset;

export interface RecordingFrame {
  timestamp: number;
  observation: {
    jointPositions: number[];
    image?: string; // base64 or blob URL
  };
  action: {
    jointTargets: number[];
  };
  done: boolean;
}

export interface EpisodeChunk {
  id: string;
  episodeId: string;
  chunkIndex: number;
  frames: RecordingFrame[];
  startTimestamp: number;
  endTimestamp: number;
}

export interface ChunkedEpisode {
  id: string;
  metadata: {
    task: string;
    robotId: string;
    startTime: number;
    duration: number;
    success: boolean;
    languageInstruction?: string;
  };
  chunks: EpisodeChunk[];
  totalFrames: number;
}

/**
 * Chunked Episode Recorder
 *
 * Automatically splits recordings into chunks to prevent memory issues.
 */
export class ChunkedEpisodeRecorder {
  private currentChunk: RecordingFrame[] = [];
  private chunks: EpisodeChunk[] = [];
  private episodeId: string = '';
  private startTime: number = 0;
  private frameCount: number = 0;
  private chunkIndex: number = 0;
  private chunkStartTimestamp: number = 0;
  private isRecording: boolean = false;
  private maxChunkSize: number;
  private onChunkComplete?: (chunk: EpisodeChunk) => void;

  constructor(options: {
    maxChunkSize?: number;
    onChunkComplete?: (chunk: EpisodeChunk) => void;
  } = {}) {
    this.maxChunkSize = options.maxChunkSize || EPISODE_CONFIG.CHUNK_SIZE;
    this.onChunkComplete = options.onChunkComplete;
  }

  /**
   * Start a new recording
   */
  start(task: string = 'default'): void {
    this.episodeId = generateSecureId('ep');
    this.startTime = Date.now();
    this.chunkStartTimestamp = 0;
    this.currentChunk = [];
    this.chunks = [];
    this.frameCount = 0;
    this.chunkIndex = 0;
    this.isRecording = true;

    log.info(`Started recording episode ${this.episodeId}`, { task });
  }

  /**
   * Add a frame to the recording
   */
  addFrame(frame: Omit<RecordingFrame, 'timestamp'>): void {
    if (!this.isRecording) {
      log.warn('Attempted to add frame while not recording');
      return;
    }

    const timestamp = Date.now() - this.startTime;
    const fullFrame: RecordingFrame = {
      ...frame,
      timestamp,
    };

    if (this.currentChunk.length === 0) {
      this.chunkStartTimestamp = timestamp;
    }

    this.currentChunk.push(fullFrame);
    this.frameCount++;

    // Check if chunk is full
    if (this.currentChunk.length >= this.maxChunkSize) {
      this.finalizeCurrentChunk();
    }
  }

  /**
   * Finalize the current chunk and start a new one
   */
  private finalizeCurrentChunk(): void {
    if (this.currentChunk.length === 0) return;

    const chunk: EpisodeChunk = {
      id: generateSecureId('chunk'),
      episodeId: this.episodeId,
      chunkIndex: this.chunkIndex,
      frames: [...this.currentChunk],
      startTimestamp: this.chunkStartTimestamp,
      endTimestamp: this.currentChunk[this.currentChunk.length - 1].timestamp,
    };

    this.chunks.push(chunk);
    this.chunkIndex++;
    this.currentChunk = [];

    log.debug(`Finalized chunk ${chunk.chunkIndex}`, {
      frames: chunk.frames.length,
      episodeId: this.episodeId,
    });

    // Notify listener if provided
    if (this.onChunkComplete) {
      this.onChunkComplete(chunk);
    }
  }

  /**
   * Stop recording and return the complete episode
   */
  stop(metadata: {
    task?: string;
    robotId?: string;
    success?: boolean;
    languageInstruction?: string;
  } = {}): ChunkedEpisode {
    if (!this.isRecording) {
      log.warn('Attempted to stop recording while not recording');
      return this.createEmptyEpisode();
    }

    // Finalize any remaining frames
    this.finalizeCurrentChunk();

    this.isRecording = false;
    const duration = Date.now() - this.startTime;

    const episode: ChunkedEpisode = {
      id: this.episodeId,
      metadata: {
        task: metadata.task || 'default',
        robotId: metadata.robotId || 'unknown',
        startTime: this.startTime,
        duration,
        success: metadata.success ?? true,
        languageInstruction: metadata.languageInstruction,
      },
      chunks: this.chunks,
      totalFrames: this.frameCount,
    };

    log.info(`Stopped recording episode ${this.episodeId}`, {
      totalFrames: this.frameCount,
      chunks: this.chunks.length,
      duration,
    });

    return episode;
  }

  /**
   * Check if currently recording
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get current frame count
   */
  getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * Get current duration in ms
   */
  getDuration(): number {
    if (!this.isRecording) return 0;
    return Date.now() - this.startTime;
  }

  /**
   * Create empty episode for error cases
   */
  private createEmptyEpisode(): ChunkedEpisode {
    return {
      id: generateSecureId('ep'),
      metadata: {
        task: 'empty',
        robotId: 'unknown',
        startTime: Date.now(),
        duration: 0,
        success: false,
      },
      chunks: [],
      totalFrames: 0,
    };
  }
}

/**
 * Convert chunked episode to standard Episode format
 */
export function chunkedToStandardEpisode(chunked: ChunkedEpisode): Episode {
  // Flatten all frames from all chunks
  const allFrames = chunked.chunks.flatMap(chunk => chunk.frames);

  return {
    episodeId: 0, // Will be set by the dataset
    frames: allFrames.map(frame => ({
      timestamp: frame.timestamp,
      observation: {
        jointPositions: frame.observation.jointPositions,
        image: frame.observation.image,
      },
      action: {
        jointTargets: frame.action.jointTargets,
      },
      done: frame.done,
    })),
    metadata: {
      robotType: 'arm', // Default - can be overridden
      robotId: chunked.metadata.robotId,
      duration: chunked.metadata.duration,
      success: chunked.metadata.success,
      task: chunked.metadata.task,
      languageInstruction: chunked.metadata.languageInstruction,
      frameCount: allFrames.length,
      recordedAt: new Date(chunked.metadata.startTime).toISOString(),
    },
  };
}

/**
 * Stream export chunked episodes (for very large datasets)
 */
export async function* streamExportChunks(
  episodes: ChunkedEpisode[]
): AsyncGenerator<{ episodeIndex: number; chunk: EpisodeChunk }> {
  for (let i = 0; i < episodes.length; i++) {
    const episode = episodes[i];
    for (const chunk of episode.chunks) {
      yield { episodeIndex: i, chunk };
    }
  }
}
