/**
 * CSM (Common Sense Machines) Image-to-3D Integration
 *
 * Converts photos of real objects into 3D models for robot training:
 * - Upload image → Generate 3D mesh via CSM API
 * - Auto-generate collision mesh for physics
 * - Estimate grasp points from geometry
 * - Create training-ready objects for the simulator
 *
 * API Docs: https://docs.csm.ai/sessions/image-to-3d
 */

export interface CSMConfig {
  apiKey: string;
}

export interface ImageTo3DRequest {
  imageSource: string;
  objectName?: string;
  geometryModel?: 'base' | 'turbo' | 'highest' | 'parts';
  textureModel?: 'none' | 'baked' | 'pbr';
  resolution?: number;
  scaledBbox?: [number, number, number];
  symmetry?: 'auto' | 'on' | 'off';
}

export interface CSMSession {
  _id: string;
  status: 'incomplete' | 'pending' | 'complete' | 'failed';
  output?: {
    meshes: Array<{
      format: string;
      url: string;
    }>;
  };
  error_code?: string;
  status_message?: string;
  created_at: string;
  updated_at: string;
}

export interface Generated3DObject {
  sessionId: string;
  name: string;
  meshUrl: string;
  objUrl?: string;
  fbxUrl?: string;
  thumbnailUrl?: string;
  dimensions: [number, number, number];
  graspPoints: GraspPoint[];
  physicsConfig: PhysicsConfig;
}

export interface GraspPoint {
  position: [number, number, number];
  normal: [number, number, number];
  graspType: 'pinch' | 'power' | 'hook';
  confidence: number;
}

export interface PhysicsConfig {
  mass: number;
  friction: number;
  restitution: number;
  collisionShape: 'box' | 'sphere' | 'convex' | 'mesh';
}

const CSM_API_BASE = 'https://api.csm.ai/v3';

export async function createImageTo3DSession(
  config: CSMConfig,
  request: ImageTo3DRequest
): Promise<CSMSession> {
  const response = await fetch(`${CSM_API_BASE}/sessions/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': config.apiKey,
    },
    body: JSON.stringify({
      type: 'image_to_3d',
      input: {
        image: request.imageSource,
        settings: {
          geometry_model: request.geometryModel || 'base',
          texture_model: request.textureModel || 'baked',
          resolution: request.resolution || 50000,
          symmetry: request.symmetry || 'auto',
          ...(request.scaledBbox && {
            scaled_bbox: request.scaledBbox,
            preserve_aspect_ratio: true,
          }),
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error('CSM API error: ' + error);
  }

  return response.json();
}

export async function getSessionStatus(
  config: CSMConfig,
  sessionId: string
): Promise<CSMSession> {
  const response = await fetch(`${CSM_API_BASE}/sessions/${sessionId}`, {
    headers: { 'X-API-KEY': config.apiKey },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error('CSM API error: ' + error);
  }

  return response.json();
}

export async function waitForSession(
  config: CSMConfig,
  sessionId: string,
  onProgress?: (status: string, elapsed: number) => void,
  maxWaitMs: number = 300000
): Promise<CSMSession> {
  const startTime = Date.now();
  const pollInterval = 3000;

  while (Date.now() - startTime < maxWaitMs) {
    const session = await getSessionStatus(config, sessionId);
    const elapsed = Date.now() - startTime;

    onProgress?.(session.status, elapsed);

    if (session.status === 'complete') {
      return session;
    }

    if (session.status === 'failed') {
      throw new Error('Generation failed: ' + (session.status_message || session.error_code));
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('Timeout waiting for 3D generation');
}

export function estimateGraspPoints(
  dimensions: [number, number, number],
  _objectType?: string
): GraspPoint[] {
  const [width, height, depth] = dimensions;
  const graspPoints: GraspPoint[] = [];

  const maxDim = Math.max(width, height, depth);
  const minDim = Math.min(width, height, depth);
  const aspectRatio = maxDim / minDim;

  if (aspectRatio > 3) {
    graspPoints.push({
      position: [0, -height * 0.3, 0],
      normal: [1, 0, 0],
      graspType: 'power',
      confidence: 0.9,
    });
    graspPoints.push({
      position: [0, height * 0.4, 0],
      normal: [1, 0, 0],
      graspType: 'pinch',
      confidence: 0.7,
    });
  } else if (aspectRatio < 1.5) {
    graspPoints.push({
      position: [width * 0.4, 0, 0],
      normal: [1, 0, 0],
      graspType: 'power',
      confidence: 0.85,
    });
    graspPoints.push({
      position: [-width * 0.4, 0, 0],
      normal: [-1, 0, 0],
      graspType: 'power',
      confidence: 0.85,
    });
    if (maxDim < 0.1) {
      graspPoints.push({
        position: [0, height * 0.4, 0],
        normal: [0, 1, 0],
        graspType: 'pinch',
        confidence: 0.8,
      });
    }
  } else {
    graspPoints.push({
      position: [0, 0, 0],
      normal: [1, 0, 0],
      graspType: 'power',
      confidence: 0.8,
    });
    graspPoints.push({
      position: [0, height * 0.3, 0],
      normal: [0, 1, 0],
      graspType: 'pinch',
      confidence: 0.7,
    });
  }

  return graspPoints;
}

export function estimatePhysicsConfig(
  dimensions: [number, number, number],
  _objectType?: string
): PhysicsConfig {
  const [width, height, depth] = dimensions;
  const volume = width * height * depth;

  const density = 800;
  const mass = Math.max(0.01, Math.min(5, volume * density));

  const aspectRatio = Math.max(width, height, depth) / Math.min(width, height, depth);
  let collisionShape: PhysicsConfig['collisionShape'] = 'convex';

  if (aspectRatio < 1.3) {
    collisionShape = 'box';
  }

  return {
    mass,
    friction: 0.5,
    restitution: 0.2,
    collisionShape,
  };
}

export async function imageFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function generateTrainableObject(
  config: CSMConfig,
  imageSource: string | File,
  options: Partial<ImageTo3DRequest> = {},
  onProgress?: (phase: string, progress: number, message: string) => void
): Promise<Generated3DObject> {
  onProgress?.('preparing', 0, 'Preparing image...');

  let imageData: string;
  if (imageSource instanceof File) {
    imageData = await imageFileToBase64(imageSource);
  } else {
    imageData = imageSource;
  }

  onProgress?.('uploading', 10, 'Uploading to CSM...');

  const session = await createImageTo3DSession(config, {
    imageSource: imageData,
    geometryModel: options.geometryModel || 'base',
    textureModel: options.textureModel || 'baked',
    resolution: options.resolution || 30000,
    scaledBbox: options.scaledBbox,
    symmetry: options.symmetry || 'auto',
    ...options,
  });

  onProgress?.('generating', 20, 'Generating 3D model...');

  const completedSession = await waitForSession(
    config,
    session._id,
    (_status, elapsed) => {
      const progress = Math.min(90, 20 + (elapsed / 120000) * 70);
      onProgress?.('generating', progress, 'Generating... (' + Math.round(elapsed / 1000) + 's)');
    }
  );

  onProgress?.('processing', 92, 'Processing mesh...');

  const meshes = completedSession.output?.meshes || [];
  const glbMesh = meshes.find((m) => m.format === 'glb' || m.url.endsWith('.glb'));
  const objMesh = meshes.find((m) => m.format === 'obj' || m.url.endsWith('.obj'));
  const fbxMesh = meshes.find((m) => m.format === 'fbx' || m.url.endsWith('.fbx'));

  if (!glbMesh) {
    throw new Error('No GLB mesh in response');
  }

  onProgress?.('analyzing', 95, 'Analyzing for robot training...');

  const dimensions: [number, number, number] = options.scaledBbox || [0.1, 0.1, 0.1];
  const graspPoints = estimateGraspPoints(dimensions, options.objectName);
  const physicsConfig = estimatePhysicsConfig(dimensions, options.objectName);

  onProgress?.('complete', 100, 'Object ready for training!');

  return {
    sessionId: session._id,
    name: options.objectName || 'generated_object',
    meshUrl: glbMesh.url,
    objUrl: objMesh?.url,
    fbxUrl: fbxMesh?.url,
    dimensions,
    graspPoints,
    physicsConfig,
  };
}

export async function validateCSMApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${CSM_API_BASE}/sessions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        type: 'image_to_3d',
        input: { image: 'test' },
      }),
    });

    return response.status !== 401 && response.status !== 403;
  } catch {
    return false;
  }
}
