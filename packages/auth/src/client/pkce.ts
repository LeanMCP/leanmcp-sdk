/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.1
 *
 * RFC 7636: https://tools.ietf.org/html/rfc7636
 *
 * PKCE protects against authorization code interception attacks
 * by using a cryptographic challenge during the OAuth flow.
 */

import { createHash, randomBytes } from 'crypto';

/**
 * PKCE code challenge and verifier pair
 */
export interface PKCEPair {
  /** High-entropy random string (43-128 chars) */
  verifier: string;
  /** SHA256 hash of verifier, base64url encoded */
  challenge: string;
  /** Challenge method - always S256 for security */
  method: 'S256';
}

/**
 * Generate a cryptographically secure PKCE code verifier.
 *
 * The verifier is a high-entropy random string between 43-128 characters
 * using unreserved characters: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 *
 * @param length - Length of the verifier (default: 64, min: 43, max: 128)
 * @returns Base64url-encoded random string
 */
export function generateCodeVerifier(length: number = 64): string {
  if (length < 43 || length > 128) {
    throw new Error('PKCE code verifier must be between 43-128 characters');
  }

  // Generate random bytes and encode as base64url
  // We need slightly more bytes since base64 expands data
  const bytesNeeded = Math.ceil(length * 0.75);
  const randomBuffer = randomBytes(bytesNeeded);

  return randomBuffer.toString('base64url').slice(0, length);
}

/**
 * Generate a PKCE code challenge from a code verifier.
 *
 * Uses the S256 method: BASE64URL(SHA256(verifier))
 *
 * @param verifier - The code verifier string
 * @returns Base64url-encoded SHA256 hash
 */
export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier, 'utf8').digest('base64url');
}

/**
 * Generate a complete PKCE pair (verifier and challenge).
 *
 * @example
 * ```typescript
 * const pkce = generatePKCE();
 * // Send challenge in authorization request
 * const authUrl = `${authorizationEndpoint}?code_challenge=${pkce.challenge}&code_challenge_method=S256`;
 * // Send verifier in token request
 * const tokenPayload = { code_verifier: pkce.verifier, ... };
 * ```
 *
 * @param verifierLength - Length of the verifier (default: 64)
 * @returns PKCE pair with verifier, challenge, and method
 */
export function generatePKCE(verifierLength: number = 64): PKCEPair {
  const verifier = generateCodeVerifier(verifierLength);
  const challenge = generateCodeChallenge(verifier);

  return {
    verifier,
    challenge,
    method: 'S256',
  };
}

/**
 * Verify that a code verifier matches a code challenge.
 *
 * Used server-side to validate PKCE during token exchange.
 *
 * @param verifier - The code verifier from token request
 * @param challenge - The code challenge from authorization request
 * @param method - The challenge method (only 'S256' supported)
 * @returns True if verifier matches challenge
 */
export function verifyPKCE(
  verifier: string,
  challenge: string,
  method: 'S256' | 'plain' = 'S256'
): boolean {
  if (method === 'plain') {
    // Plain method (not recommended, but supported for compatibility)
    return verifier === challenge;
  }

  // S256 method
  const expectedChallenge = generateCodeChallenge(verifier);
  return expectedChallenge === challenge;
}

/**
 * Validate that a string is a valid PKCE code verifier.
 *
 * @param verifier - String to validate
 * @returns True if valid verifier format
 */
export function isValidCodeVerifier(verifier: string): boolean {
  // Must be 43-128 characters
  if (verifier.length < 43 || verifier.length > 128) {
    return false;
  }

  // Must contain only unreserved characters (base64url is a subset)
  // [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
  const validPattern = /^[A-Za-z0-9\-._~]+$/;
  return validPattern.test(verifier);
}
