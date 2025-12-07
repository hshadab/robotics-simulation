/**
 * Visual Configuration Store
 *
 * Manages domain randomization settings for lighting, materials, and camera.
 * Separated from main app store for cleaner architecture.
 */

import { create } from 'zustand';
import {
  DEFAULT_DOMAIN_CONFIG,
  randomizeDomainConfig,
  applyLightingPreset,
  LIGHTING_PRESETS,
  type DomainRandomizationConfig,
  type LightingConfig,
  type MaterialConfig,
  type CameraConfig,
} from '../lib/domainRandomization';

interface VisualState {
  // Current configuration
  config: DomainRandomizationConfig;

  // Whether to auto-randomize between recordings
  autoRandomize: boolean;

  // Actions
  setConfig: (config: DomainRandomizationConfig) => void;
  updateLighting: (updates: Partial<LightingConfig>) => void;
  updateMaterials: (updates: Partial<MaterialConfig>) => void;
  updateCamera: (updates: Partial<CameraConfig>) => void;
  randomize: () => void;
  reset: () => void;
  applyPreset: (preset: keyof typeof LIGHTING_PRESETS) => void;
  setAutoRandomize: (auto: boolean) => void;
}

export const useVisualStore = create<VisualState>((set) => ({
  config: DEFAULT_DOMAIN_CONFIG,
  autoRandomize: false,

  setConfig: (config) => set({ config }),

  updateLighting: (updates) =>
    set((state) => ({
      config: {
        ...state.config,
        lighting: {
          ...state.config.lighting,
          ...updates,
        },
      },
    })),

  updateMaterials: (updates) =>
    set((state) => ({
      config: {
        ...state.config,
        materials: {
          ...state.config.materials,
          ...updates,
        },
      },
    })),

  updateCamera: (updates) =>
    set((state) => ({
      config: {
        ...state.config,
        camera: {
          ...state.config.camera,
          ...updates,
        },
      },
    })),

  randomize: () =>
    set({ config: randomizeDomainConfig(DEFAULT_DOMAIN_CONFIG) }),

  reset: () => set({ config: DEFAULT_DOMAIN_CONFIG }),

  applyPreset: (preset) =>
    set((state) => ({
      config: applyLightingPreset(state.config, preset),
    })),

  setAutoRandomize: (auto) => set({ autoRandomize: auto }),
}));

/**
 * Hook to get just the lighting config (for 3D scene)
 */
export const useLightingConfig = () => {
  return useVisualStore((state) => state.config.lighting);
};

/**
 * Hook to get just the materials config
 */
export const useMaterialsConfig = () => {
  return useVisualStore((state) => state.config.materials);
};

/**
 * Hook to get just the camera config
 */
export const useCameraConfig = () => {
  return useVisualStore((state) => state.config.camera);
};
