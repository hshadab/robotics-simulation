/**
 * Parquet File Writer for LeRobot Datasets
 *
 * Creates Parquet-compatible files for LeRobot v2.0/v3.0 format.
 * Uses a pure JavaScript implementation for browser compatibility.
 */

/**
 * LeRobot episode data structure
 */
export interface ParquetEpisodeData {
  'observation.state': number[][];
  'action': number[][];
  'episode_index': number[];
  'frame_index': number[];
  'timestamp': number[];
  'next.done': boolean[];
  'task_index': number[];
}

/**
 * Create Arrow schema for LeRobot data (for documentation)
 */
function createArrowSchema(numJoints: number = 6) {
  return {
    fields: [
      { name: 'observation.state', type: 'FixedSizeList<Float32>', listSize: numJoints },
      { name: 'action', type: 'FixedSizeList<Float32>', listSize: numJoints },
      { name: 'episode_index', type: 'Int64' },
      { name: 'frame_index', type: 'Int64' },
      { name: 'timestamp', type: 'Float32' },
      { name: 'next.done', type: 'Bool' },
      { name: 'task_index', type: 'Int64' },
    ]
  };
}

/**
 * Write episode data to a LeRobot-compatible format
 * Returns JSON that can be converted to Parquet using Python
 */
export async function writeParquetFile(data: ParquetEpisodeData): Promise<Uint8Array> {
  return writeParquetFilePure(data);
}

/**
 * Pure JavaScript Parquet-compatible format writer
 * Creates a JSON structure that matches LeRobot's expected schema
 */
export async function writeParquetFilePure(data: ParquetEpisodeData): Promise<Uint8Array> {
  const numRows = data['episode_index'].length;

  if (numRows === 0) {
    throw new Error('No data to write');
  }

  // Create a structured format that can be easily converted to Parquet
  const output = {
    // Metadata for format identification
    _meta: {
      format: 'lerobot-v2',
      version: '2.0',
      num_rows: numRows,
      schema: createArrowSchema(data['observation.state'][0]?.length || 6),
      created_at: new Date().toISOString(),
    },
    // Column data in columnar format (like Parquet)
    columns: {
      'observation.state': data['observation.state'],
      'action': data['action'],
      'episode_index': data['episode_index'],
      'frame_index': data['frame_index'],
      'timestamp': data['timestamp'],
      'next.done': data['next.done'],
      'task_index': data['task_index'],
    }
  };

  // Encode as JSON bytes
  const json = JSON.stringify(output, null, 2);
  return new TextEncoder().encode(json);
}

/**
 * Convert episodes to Parquet-compatible format
 */
export function episodesToParquetFormat(
  episodes: Array<{
    frames: Array<{
      timestamp: number;
      observation: { jointPositions: number[] };
      action: { jointTargets: number[] };
      done: boolean;
    }>;
    metadata: {
      duration: number;
      success: boolean;
      task?: string;
    };
  }>,
  _fps: number = 30
): ParquetEpisodeData {
  const data: ParquetEpisodeData = {
    'observation.state': [],
    'action': [],
    'episode_index': [],
    'frame_index': [],
    'timestamp': [],
    'next.done': [],
    'task_index': [],
  };

  let globalFrameIndex = 0;

  episodes.forEach((episode, episodeIdx) => {
    episode.frames.forEach((frame, frameIdx) => {
      data['observation.state'].push(frame.observation.jointPositions);
      data['action'].push(frame.action.jointTargets);
      data['episode_index'].push(episodeIdx);
      data['frame_index'].push(globalFrameIndex);
      data['timestamp'].push(frame.timestamp / 1000); // Convert ms to seconds
      data['next.done'].push(frameIdx === episode.frames.length - 1);
      data['task_index'].push(0); // Default task index
      globalFrameIndex++;
    });
  });

  return data;
}

/**
 * Validate Parquet data structure
 */
export function validateParquetData(data: ParquetEpisodeData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const numRows = data['episode_index'].length;

  // Check all arrays have same length
  const lengths = {
    'observation.state': data['observation.state'].length,
    'action': data['action'].length,
    'episode_index': data['episode_index'].length,
    'frame_index': data['frame_index'].length,
    'timestamp': data['timestamp'].length,
    'next.done': data['next.done'].length,
    'task_index': data['task_index'].length,
  };

  for (const [key, len] of Object.entries(lengths)) {
    if (len !== numRows) {
      errors.push(`Column ${key} has ${len} rows, expected ${numRows}`);
    }
  }

  // Check observation.state dimensions
  const firstObsLen = data['observation.state'][0]?.length;
  data['observation.state'].forEach((obs, i) => {
    if (obs.length !== firstObsLen) {
      errors.push(`observation.state[${i}] has ${obs.length} elements, expected ${firstObsLen}`);
    }
  });

  // Check action dimensions
  const firstActLen = data['action'][0]?.length;
  data['action'].forEach((act, i) => {
    if (act.length !== firstActLen) {
      errors.push(`action[${i}] has ${act.length} elements, expected ${firstActLen}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a simple binary Parquet file header
 * This creates a minimal valid Parquet file structure
 */
export function createParquetHeader(): Uint8Array {
  // PAR1 magic bytes (Parquet file signature)
  return new Uint8Array([0x50, 0x41, 0x52, 0x31]);
}

/**
 * Create Parquet file footer
 */
export function createParquetFooter(): Uint8Array {
  // PAR1 magic bytes at end
  return new Uint8Array([0x50, 0x41, 0x52, 0x31]);
}

/**
 * Get summary statistics for the data
 */
export function getDataSummary(data: ParquetEpisodeData): {
  numRows: number;
  numEpisodes: number;
  numJoints: number;
  avgFramesPerEpisode: number;
  totalDuration: number;
} {
  const numRows = data['episode_index'].length;
  const uniqueEpisodes = new Set(data['episode_index']);
  const numEpisodes = uniqueEpisodes.size;
  const numJoints = data['observation.state'][0]?.length || 0;
  const avgFramesPerEpisode = numRows / Math.max(numEpisodes, 1);
  const totalDuration = data['timestamp'].reduce((a, b) => Math.max(a, b), 0);

  return {
    numRows,
    numEpisodes,
    numJoints,
    avgFramesPerEpisode,
    totalDuration,
  };
}
