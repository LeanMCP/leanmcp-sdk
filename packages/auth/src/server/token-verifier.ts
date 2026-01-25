/**
 * Token Verifier
 *
 * Verifies JWT access tokens on the resource server side.
 */

import type { TokenVerifierOptions, JWTPayload, TokenVerificationResult } from './types';
import { verifyJWT, decryptUpstreamToken } from './jwt-utils';

/**
 * Token Verifier for resource servers
 *
 * @example
 * ```typescript
 * const verifier = new TokenVerifier({
 *   audience: 'https://mcp.example.com',
 *   issuer: 'https://auth.example.com',
 *   secret: process.env.JWT_SIGNING_SECRET,
 *   encryptionSecret: Buffer.from(process.env.JWT_ENCRYPTION_SECRET, 'hex'),
 * });
 *
 * const result = await verifier.verify(accessToken);
 * if (result.valid) {
 *   console.log('User:', result.claims.sub);
 *   console.log('Upstream token:', result.upstreamToken);
 * } else {
 *   console.error('Invalid token:', result.error);
 * }
 * ```
 */
export class TokenVerifier {
  private options: {
    audience: string;
    issuer: string;
    secret: string;
    clockTolerance: number;
    encryptionSecret?: Buffer;
  };

  constructor(options: TokenVerifierOptions & { encryptionSecret?: Buffer }) {
    if (!options.secret) {
      throw new Error('JWT signing secret is required');
    }

    this.options = {
      audience: options.audience,
      issuer: options.issuer,
      secret: options.secret,
      clockTolerance: options.clockTolerance ?? 60, // 60 seconds default
      encryptionSecret: options.encryptionSecret,
    };
  }

  /**
   * Verify a JWT access token
   *
   * @param token - The JWT access token to verify
   * @returns Verification result with claims and decrypted upstream token if valid
   */
  async verify(token: string): Promise<TokenVerificationResult & { upstreamToken?: string }> {
    if (!token) {
      return {
        valid: false,
        error: 'No token provided',
        errorCode: 'invalid_token',
      };
    }

    try {
      // Verify JWT signature and decode
      const payload = verifyJWT(token, this.options.secret);

      // Validate issuer
      if (this.options.issuer && payload.iss !== this.options.issuer) {
        return {
          valid: false,
          error: `Invalid issuer: expected ${this.options.issuer}, got ${payload.iss}`,
          errorCode: 'invalid_token',
        };
      }

      // Validate audience
      if (this.options.audience) {
        const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        if (!audiences.includes(this.options.audience)) {
          return {
            valid: false,
            error: `Invalid audience: expected ${this.options.audience}`,
            errorCode: 'invalid_token',
          };
        }
      }

      // Decrypt upstream token if present
      let upstreamToken: string | undefined;
      if (payload.upstream_token && this.options.encryptionSecret) {
        try {
          upstreamToken = decryptUpstreamToken(
            payload.upstream_token,
            this.options.encryptionSecret
          );
        } catch (error: any) {
          return {
            valid: false,
            error: `Failed to decrypt upstream token: ${error.message}`,
            errorCode: 'invalid_token',
          };
        }
      }

      return {
        valid: true,
        claims: payload,
        upstreamToken,
      };
    } catch (error: any) {
      // verifyJWT throws on expiration or invalid signature
      if (error.message.includes('expired')) {
        return {
          valid: false,
          error: error.message,
          errorCode: 'expired_token',
        };
      }
      return {
        valid: false,
        error: error.message,
        errorCode: 'invalid_token',
      };
    }
  }

  /**
   * Generate WWW-Authenticate header for 401 responses
   *
   * Per RFC 9728, this should include the resource_metadata URL
   *
   * @param options - Header options
   * @returns WWW-Authenticate header value
   */
  static getWWWAuthenticateHeader(options: {
    resourceMetadataUrl: string;
    error?: string;
    errorDescription?: string;
    scope?: string;
  }): string {
    const parts = [`Bearer resource_metadata="${options.resourceMetadataUrl}"`];

    if (options.error) {
      parts.push(`error="${options.error}"`);
    }

    if (options.errorDescription) {
      parts.push(`error_description="${options.errorDescription}"`);
    }

    if (options.scope) {
      parts.push(`scope="${options.scope}"`);
    }

    return parts.join(', ');
  }

  /**
   * Check if token has required scopes
   */
  hasScopes(claims: JWTPayload, requiredScopes: string[]): boolean {
    if (requiredScopes.length === 0) return true;

    const tokenScopes =
      typeof claims.scope === 'string'
        ? claims.scope.split(' ')
        : (claims.scope as string[] | undefined) || [];

    return requiredScopes.every((scope) => tokenScopes.includes(scope));
  }
}
