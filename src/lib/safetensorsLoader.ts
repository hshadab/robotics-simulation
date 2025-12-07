/**
 * SafeTensors Loader
 *
 * Loads SafeTensors model files for LeRobot policies.
 * SafeTensors is the native format for HuggingFace models.
 *
 * Format spec: https://huggingface.co/docs/safetensors
 */

/**
 * SafeTensors file header structure
 */
interface SafeTensorsHeader {
  __metadata__?: Record<string, string>;
  [tensorName: string]: TensorInfo | Record<string, string> | undefined;
}

interface TensorInfo {
  dtype: string;
  shape: number[];
  data_offsets: [number, number];
}

/**
 * Loaded tensor data
 */
export interface LoadedTensor {
  name: string;
  dtype: string;
  shape: number[];
  data: Float32Array | Int32Array | Uint8Array | BigInt64Array;
}

/**
 * Model weights loaded from SafeTensors
 */
export interface SafeTensorsModel {
  metadata: Record<string, string>;
  tensors: Map<string, LoadedTensor>;
}

/**
 * Supported dtypes and their byte sizes
 */
const DTYPE_SIZES: Record<string, number> = {
  'F32': 4,
  'F16': 2,
  'BF16': 2,
  'I64': 8,
  'I32': 4,
  'I16': 2,
  'I8': 1,
  'U8': 1,
  'BOOL': 1,
};

/**
 * Parse SafeTensors header from buffer
 */
function parseHeader(buffer: ArrayBuffer): { header: SafeTensorsHeader; dataStart: number } {
  const view = new DataView(buffer);

  // First 8 bytes are the header size (little-endian u64)
  const headerSize = Number(view.getBigUint64(0, true));

  if (headerSize > buffer.byteLength - 8) {
    throw new Error('Invalid SafeTensors file: header size exceeds buffer');
  }

  // Decode header JSON
  const headerBytes = new Uint8Array(buffer, 8, headerSize);
  const headerText = new TextDecoder().decode(headerBytes);
  const header: SafeTensorsHeader = JSON.parse(headerText);

  return {
    header,
    dataStart: 8 + headerSize,
  };
}

/**
 * Create typed array from buffer based on dtype
 */
function createTypedArray(
  buffer: ArrayBuffer,
  offset: number,
  length: number,
  dtype: string
): Float32Array | Int32Array | Uint8Array | BigInt64Array {
  const byteSize = DTYPE_SIZES[dtype] || 4;
  const numElements = length / byteSize;

  switch (dtype) {
    case 'F32':
      return new Float32Array(buffer, offset, numElements);
    case 'I32':
      return new Int32Array(buffer, offset, numElements);
    case 'I64':
      return new BigInt64Array(buffer, offset, numElements);
    case 'U8':
    case 'BOOL':
      return new Uint8Array(buffer, offset, numElements);
    case 'F16':
    case 'BF16':
      // F16/BF16 need conversion to F32 for JavaScript
      return convertHalfToFloat(new Uint8Array(buffer, offset, length), dtype);
    default:
      console.warn(`Unknown dtype ${dtype}, treating as F32`);
      return new Float32Array(buffer, offset, numElements);
  }
}

/**
 * Convert F16/BF16 to F32
 */
function convertHalfToFloat(bytes: Uint8Array, dtype: string): Float32Array {
  const numFloats = bytes.length / 2;
  const result = new Float32Array(numFloats);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  for (let i = 0; i < numFloats; i++) {
    const half = view.getUint16(i * 2, true);

    if (dtype === 'BF16') {
      // BF16: just shift left 16 bits to get F32
      const f32Bits = half << 16;
      const f32View = new DataView(new ArrayBuffer(4));
      f32View.setInt32(0, f32Bits, true);
      result[i] = f32View.getFloat32(0, true);
    } else {
      // F16: IEEE 754 half-precision to single-precision
      const sign = (half >> 15) & 0x1;
      const exponent = (half >> 10) & 0x1f;
      const mantissa = half & 0x3ff;

      let f32: number;
      if (exponent === 0) {
        // Subnormal or zero
        f32 = Math.pow(-1, sign) * Math.pow(2, -14) * (mantissa / 1024);
      } else if (exponent === 31) {
        // Infinity or NaN
        f32 = mantissa === 0 ? (sign ? -Infinity : Infinity) : NaN;
      } else {
        // Normal number
        f32 = Math.pow(-1, sign) * Math.pow(2, exponent - 15) * (1 + mantissa / 1024);
      }

      result[i] = f32;
    }
  }

  return result;
}

/**
 * Load SafeTensors file from ArrayBuffer
 */
export function loadSafeTensors(buffer: ArrayBuffer): SafeTensorsModel {
  const { header, dataStart } = parseHeader(buffer);

  // Extract metadata
  const metadata: Record<string, string> = {};
  if (header.__metadata__) {
    Object.assign(metadata, header.__metadata__);
  }

  // Load tensors
  const tensors = new Map<string, LoadedTensor>();

  for (const [name, info] of Object.entries(header)) {
    if (name === '__metadata__' || !info || typeof info !== 'object') continue;
    if (!('dtype' in info) || !('shape' in info) || !('data_offsets' in info)) continue;

    const tensorInfo = info as TensorInfo;
    const [start, end] = tensorInfo.data_offsets;
    const byteLength = end - start;

    try {
      const data = createTypedArray(
        buffer,
        dataStart + start,
        byteLength,
        tensorInfo.dtype
      );

      tensors.set(name, {
        name,
        dtype: tensorInfo.dtype,
        shape: tensorInfo.shape,
        data,
      });
    } catch (error) {
      console.warn(`Failed to load tensor ${name}:`, error);
    }
  }

  return { metadata, tensors };
}

/**
 * Download and load SafeTensors from URL
 */
export async function loadSafeTensorsFromUrl(
  url: string,
  onProgress?: (progress: number, message: string) => void
): Promise<SafeTensorsModel> {
  onProgress?.(0, 'Downloading SafeTensors model...');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (total > 0 && response.body) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      received += value.length;

      const progress = Math.round((received / total) * 100);
      onProgress?.(progress, `Downloading... ${formatBytes(received)}/${formatBytes(total)}`);
    }

    // Combine chunks
    const buffer = new ArrayBuffer(received);
    const view = new Uint8Array(buffer);
    let offset = 0;
    for (const chunk of chunks) {
      view.set(chunk, offset);
      offset += chunk.length;
    }

    onProgress?.(100, 'Parsing SafeTensors...');
    return loadSafeTensors(buffer);
  }

  // Fallback for responses without content-length
  const buffer = await response.arrayBuffer();
  onProgress?.(100, 'Parsing SafeTensors...');
  return loadSafeTensors(buffer);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get tensor by name pattern (supports wildcards)
 */
export function getTensorByPattern(
  model: SafeTensorsModel,
  pattern: string
): LoadedTensor | undefined {
  // Exact match first
  if (model.tensors.has(pattern)) {
    return model.tensors.get(pattern);
  }

  // Pattern match (simple * wildcard)
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  for (const [name, tensor] of model.tensors) {
    if (regex.test(name)) {
      return tensor;
    }
  }

  return undefined;
}

/**
 * List all tensor names in model
 */
export function listTensors(model: SafeTensorsModel): string[] {
  return Array.from(model.tensors.keys());
}

/**
 * Get model summary
 */
export function getModelSummary(model: SafeTensorsModel): {
  numTensors: number;
  totalParams: number;
  totalSizeBytes: number;
  dtypes: string[];
} {
  let totalParams = 0;
  let totalSizeBytes = 0;
  const dtypes = new Set<string>();

  for (const tensor of model.tensors.values()) {
    const numElements = tensor.shape.reduce((a, b) => a * b, 1);
    totalParams += numElements;
    totalSizeBytes += tensor.data.byteLength;
    dtypes.add(tensor.dtype);
  }

  return {
    numTensors: model.tensors.size,
    totalParams,
    totalSizeBytes,
    dtypes: Array.from(dtypes),
  };
}

/**
 * Check if SafeTensors model is compatible with SO-101
 */
export function checkSO101Compatibility(model: SafeTensorsModel): {
  compatible: boolean;
  inputDim: number | null;
  outputDim: number | null;
  issues: string[];
} {
  const issues: string[] = [];
  let inputDim: number | null = null;
  let outputDim: number | null = null;

  // Look for input/output layers
  for (const tensor of model.tensors.values()) {
    const name = tensor.name.toLowerCase();

    // Check input dimension (should be 6 for SO-101 joints)
    if (name.includes('input') || name.includes('encoder') || name.includes('embed')) {
      if (tensor.shape.length >= 2) {
        const lastDim = tensor.shape[tensor.shape.length - 1];
        if (lastDim === 6 || lastDim === 12 || lastDim === 14) {
          inputDim = lastDim;
        }
      }
    }

    // Check output dimension (should be 6 for SO-101 actions)
    if (name.includes('output') || name.includes('decoder') || name.includes('action')) {
      if (tensor.shape.length >= 2) {
        const lastDim = tensor.shape[tensor.shape.length - 1];
        if (lastDim === 6) {
          outputDim = lastDim;
        }
      }
    }
  }

  if (!outputDim) {
    issues.push('Could not detect 6-DOF output layer');
  }

  return {
    compatible: issues.length === 0,
    inputDim,
    outputDim,
    issues,
  };
}
