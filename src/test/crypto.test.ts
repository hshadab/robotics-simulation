import { describe, it, expect } from 'vitest';
import { generateSecureId, generateUUID, generateShortId, hashString } from '../lib/crypto';

describe('crypto utilities', () => {
  describe('generateSecureId', () => {
    it('generates unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateSecureId());
      }
      expect(ids.size).toBe(100);
    });

    it('includes prefix when provided', () => {
      const id = generateSecureId('test');
      expect(id).toMatch(/^test_[0-9a-f]+$/);
    });

    it('generates IDs of expected length', () => {
      const id = generateSecureId('', 8);
      expect(id.length).toBe(16); // 8 bytes = 16 hex chars
    });
  });

  describe('generateUUID', () => {
    it('generates valid UUID v4 format', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('generates unique UUIDs', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe('generateShortId', () => {
    it('generates IDs of specified length', () => {
      const id = generateShortId(10);
      expect(id.length).toBe(10);
    });

    it('generates alphanumeric IDs', () => {
      const id = generateShortId(20);
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe('hashString', () => {
    it('hashes strings consistently', async () => {
      const hash1 = await hashString('hello');
      const hash2 = await hashString('hello');
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different inputs', async () => {
      const hash1 = await hashString('hello');
      const hash2 = await hashString('world');
      expect(hash1).not.toBe(hash2);
    });

    it('returns hex string of expected length', async () => {
      const hash = await hashString('test');
      expect(hash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 = 64 hex chars
    });
  });
});
