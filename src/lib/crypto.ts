/**
 * Cryptographically Secure Utilities
 *
 * Provides secure random ID generation and other crypto utilities.
 * Uses Web Crypto API for cryptographically secure randomness.
 */

/**
 * Generate a cryptographically secure random ID
 * @param prefix - Optional prefix for the ID
 * @param length - Length of the random portion (default: 16)
 * @returns A secure unique identifier
 */
export function generateSecureId(prefix = '', length = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  const randomPart = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix ? `${prefix}_${randomPart}` : randomPart;
}

/**
 * Generate a UUID v4
 * @returns A standard UUID v4 string
 */
export function generateUUID(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);

  // Set version to 4
  array[6] = (array[6] & 0x0f) | 0x40;
  // Set variant to 10xx
  array[8] = (array[8] & 0x3f) | 0x80;

  const hex = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * Generate a short secure ID suitable for display
 * @param length - Length of the ID (default: 8)
 * @returns A short alphanumeric ID
 */
export function generateShortId(length = 8): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => charset[b % charset.length])
    .join('');
}

/**
 * Hash a string using SHA-256
 * @param data - String to hash
 * @returns Hex-encoded hash
 */
export async function hashString(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
