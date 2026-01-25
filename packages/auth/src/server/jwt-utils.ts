/**
 * JWT Utilities for Stateless OAuth
 *
 * Provides cryptographic functions for:
 * - JWT signing and verification (HS256)
 * - Upstream token encryption/decryption (AES-256-GCM)
 */

import { createHmac, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

/**
 * Encrypted token structure for upstream credentials
 */
export interface EncryptedToken {
  ciphertext: string; // Base64-encoded encrypted data
  iv: string; // Base64-encoded initialization vector
  tag: string; // Base64-encoded authentication tag
}

/**
 * JWT payload structure (RFC 7519 + custom claims)
 */
export interface JWTPayload {
  // Standard claims
  iss: string; // Issuer
  sub: string; // Subject (user ID)
  aud: string | string[]; // Audience
  exp: number; // Expiration time (Unix timestamp)
  iat: number; // Issued at (Unix timestamp)
  jti?: string; // JWT ID (optional)

  // OAuth claims
  scope?: string; // OAuth scopes
  client_id?: string; // OAuth client ID

  // User context claims
  name?: string; // User's display name
  email?: string; // User's email
  picture?: string; // User's profile picture URL

  // Upstream provider credentials
  upstream_provider?: string; // Provider ID (e.g., "github")
  upstream_token?: EncryptedToken; // Encrypted upstream access token
  upstream_refresh_token?: EncryptedToken; // Encrypted upstream refresh token (optional)
}

/**
 * Encrypt an upstream token using AES-256-GCM
 *
 * @param plaintext - The upstream token to encrypt
 * @param secret - Encryption key (must be 32 bytes)
 * @returns Encrypted token with IV and authentication tag
 */
export function encryptUpstreamToken(plaintext: string, secret: Buffer): EncryptedToken {
  if (secret.length !== 32) {
    throw new Error('Encryption secret must be 32 bytes (256 bits)');
  }

  // Generate random IV (12 bytes for GCM)
  const iv = randomBytes(12);

  // Create cipher
  const cipher = createCipheriv('aes-256-gcm', secret, iv);

  // Encrypt
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  // Get authentication tag
  const tag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

/**
 * Decrypt an upstream token using AES-256-GCM
 *
 * @param encrypted - Encrypted token object
 * @param secret - Decryption key (must be 32 bytes)
 * @returns Decrypted plaintext token
 * @throws Error if decryption fails (invalid tag, wrong key, etc.)
 */
export function decryptUpstreamToken(encrypted: EncryptedToken, secret: Buffer): string {
  if (secret.length !== 32) {
    throw new Error('Encryption secret must be 32 bytes (256 bits)');
  }

  try {
    // Parse IV and tag
    const iv = Buffer.from(encrypted.iv, 'base64');
    const tag = Buffer.from(encrypted.tag, 'base64');

    // Create decipher
    const decipher = createDecipheriv('aes-256-gcm', secret, iv);
    decipher.setAuthTag(tag);

    // Decrypt
    let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  } catch (error: any) {
    throw new Error(`Failed to decrypt upstream token: ${error.message}`);
  }
}

/**
 * Sign a JWT using HS256 (HMAC with SHA-256)
 *
 * @param payload - JWT payload object
 * @param secret - Signing secret (string)
 * @returns Signed JWT string
 */
export function signJWT(payload: JWTPayload, secret: string): string {
  // Create header
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  // Create signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', secret).update(signatureInput).digest('base64url');

  // Combine into JWT
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode a JWT using HS256
 *
 * @param token - JWT string
 * @param secret - Signing secret (string)
 * @returns Decoded payload if valid
 * @throws Error if verification fails
 */
export function verifyJWT(token: string, secret: string): JWTPayload {
  // Split JWT into parts
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  // Verify signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac('sha256', secret).update(signatureInput).digest('base64url');

  if (signature !== expectedSignature) {
    throw new Error('Invalid JWT signature');
  }

  // Decode header and payload
  const header = JSON.parse(base64UrlDecode(encodedHeader));
  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JWTPayload;

  // Verify algorithm
  if (header.alg !== 'HS256') {
    throw new Error(`Unsupported algorithm: ${header.alg}`);
  }

  // Verify expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) {
    throw new Error('JWT expired');
  }

  // Verify not before
  if (payload.iat && now < payload.iat) {
    throw new Error('JWT not yet valid');
  }

  return payload;
}

/**
 * Base64URL encode a string
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf8').toString('base64url');
}

/**
 * Base64URL decode a string
 */
function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8');
}

/**
 * Generate a unique JWT ID (jti claim)
 */
export function generateJTI(): string {
  return randomBytes(16).toString('hex');
}
