/**
 * Lazy Loading for ML Libraries
 *
 * Heavy ML libraries like transformers.js and ONNX runtime should be
 * loaded on-demand to improve initial page load time.
 */

import { loggers } from './logger';

const log = loggers.ai;

// Type definitions for lazy-loaded modules
type TransformersModule = typeof import('@huggingface/transformers');
type ONNXRuntimeModule = typeof import('onnxruntime-web');
type MediaPipeModule = typeof import('@mediapipe/tasks-vision');

// Cached module references
let transformersModule: TransformersModule | null = null;
let onnxModule: ONNXRuntimeModule | null = null;
let mediaPipeModule: MediaPipeModule | null = null;

// Loading state
const loadingState = {
  transformers: false,
  onnx: false,
  mediaPipe: false,
};

/**
 * Lazy load Hugging Face Transformers
 */
export async function loadTransformers(): Promise<TransformersModule> {
  if (transformersModule) {
    return transformersModule;
  }

  if (loadingState.transformers) {
    // Wait for ongoing load
    while (loadingState.transformers && !transformersModule) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (transformersModule) return transformersModule;
  }

  loadingState.transformers = true;
  log.info('Loading @huggingface/transformers...');

  try {
    const startTime = performance.now();
    transformersModule = await import('@huggingface/transformers');
    const loadTime = performance.now() - startTime;
    log.info(`Loaded @huggingface/transformers in ${loadTime.toFixed(0)}ms`);
    return transformersModule;
  } catch (error) {
    log.error('Failed to load @huggingface/transformers', error);
    throw error;
  } finally {
    loadingState.transformers = false;
  }
}

/**
 * Lazy load ONNX Runtime Web
 */
export async function loadONNXRuntime(): Promise<ONNXRuntimeModule> {
  if (onnxModule) {
    return onnxModule;
  }

  if (loadingState.onnx) {
    while (loadingState.onnx && !onnxModule) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (onnxModule) return onnxModule;
  }

  loadingState.onnx = true;
  log.info('Loading onnxruntime-web...');

  try {
    const startTime = performance.now();
    onnxModule = await import('onnxruntime-web');
    const loadTime = performance.now() - startTime;
    log.info(`Loaded onnxruntime-web in ${loadTime.toFixed(0)}ms`);
    return onnxModule;
  } catch (error) {
    log.error('Failed to load onnxruntime-web', error);
    throw error;
  } finally {
    loadingState.onnx = false;
  }
}

/**
 * Lazy load MediaPipe Vision
 */
export async function loadMediaPipe(): Promise<MediaPipeModule> {
  if (mediaPipeModule) {
    return mediaPipeModule;
  }

  if (loadingState.mediaPipe) {
    while (loadingState.mediaPipe && !mediaPipeModule) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (mediaPipeModule) return mediaPipeModule;
  }

  loadingState.mediaPipe = true;
  log.info('Loading @mediapipe/tasks-vision...');

  try {
    const startTime = performance.now();
    mediaPipeModule = await import('@mediapipe/tasks-vision');
    const loadTime = performance.now() - startTime;
    log.info(`Loaded @mediapipe/tasks-vision in ${loadTime.toFixed(0)}ms`);
    return mediaPipeModule;
  } catch (error) {
    log.error('Failed to load @mediapipe/tasks-vision', error);
    throw error;
  } finally {
    loadingState.mediaPipe = false;
  }
}

/**
 * Check if a module is loaded
 */
export function isModuleLoaded(module: 'transformers' | 'onnx' | 'mediaPipe'): boolean {
  switch (module) {
    case 'transformers':
      return transformersModule !== null;
    case 'onnx':
      return onnxModule !== null;
    case 'mediaPipe':
      return mediaPipeModule !== null;
    default:
      return false;
  }
}

/**
 * Preload modules in the background (call after initial render)
 */
export async function preloadMLModules(
  modules: Array<'transformers' | 'onnx' | 'mediaPipe'> = []
): Promise<void> {
  const promises = modules.map(async module => {
    try {
      switch (module) {
        case 'transformers':
          await loadTransformers();
          break;
        case 'onnx':
          await loadONNXRuntime();
          break;
        case 'mediaPipe':
          await loadMediaPipe();
          break;
      }
    } catch {
      // Ignore preload errors - they'll be handled when actually needed
    }
  });

  await Promise.allSettled(promises);
}

/**
 * Clear cached modules (for testing or memory management)
 */
export function clearModuleCache(): void {
  transformersModule = null;
  onnxModule = null;
  mediaPipeModule = null;
}
