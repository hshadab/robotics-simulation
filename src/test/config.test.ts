import { describe, it, expect } from 'vitest';
import { STORAGE_CONFIG, API_CONFIG, SIMULATION_CONFIG, validateEnvConfig } from '../lib/config';

describe('config', () => {
  describe('STORAGE_CONFIG', () => {
    it('has expected storage limits', () => {
      expect(STORAGE_CONFIG.MAX_LOCAL_STORAGE_SIZE).toBe(5 * 1024 * 1024);
      expect(STORAGE_CONFIG.MAX_SAVE_SLOTS).toBe(10);
      expect(STORAGE_CONFIG.AUTOSAVE_INTERVAL_MS).toBe(30000);
    });

    it('has all required storage keys', () => {
      expect(STORAGE_CONFIG.KEYS).toHaveProperty('SAVE_SLOTS');
      expect(STORAGE_CONFIG.KEYS).toHaveProperty('AUTOSAVE');
      expect(STORAGE_CONFIG.KEYS).toHaveProperty('CLAUDE_API_KEY');
    });
  });

  describe('API_CONFIG', () => {
    it('has valid Claude API configuration', () => {
      expect(API_CONFIG.CLAUDE.BASE_URL).toBe('https://api.anthropic.com/v1');
      expect(API_CONFIG.CLAUDE.VERSION).toBe('2023-06-01');
      expect(API_CONFIG.CLAUDE.MAX_TOKENS).toBeGreaterThan(0);
    });

    it('has reasonable timeout defaults', () => {
      expect(API_CONFIG.DEFAULT_TIMEOUT_MS).toBeGreaterThan(0);
      expect(API_CONFIG.DEFAULT_TIMEOUT_MS).toBeLessThan(60000);
    });
  });

  describe('SIMULATION_CONFIG', () => {
    it('has valid simulation settings', () => {
      expect(SIMULATION_CONFIG.TARGET_FPS).toBe(60);
      expect(SIMULATION_CONFIG.PHYSICS_TIMESTEP).toBeCloseTo(1 / 60);
      expect(SIMULATION_CONFIG.RECORDING_FRAME_RATE).toBe(30);
    });
  });

  describe('validateEnvConfig', () => {
    it('returns validation result', () => {
      const result = validateEnvConfig();
      // Result should have the expected shape
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });
});
