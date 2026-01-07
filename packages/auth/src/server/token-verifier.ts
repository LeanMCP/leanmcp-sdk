/**
 * Token Verifier
 * 
 * Verifies access tokens on the resource server side.
 * Supports both JWT verification and opaque token introspection.
 */

import { createHmac } from 'crypto';
import type {
    TokenVerifierOptions,
    TokenClaims,
    TokenVerificationResult,
} from './types';

/**
 * Token Verifier for resource servers
 * 
 * @example
 * ```typescript
 * const verifier = new TokenVerifier({
 *   audience: 'https://mcp.example.com',
 *   issuer: 'https://auth.example.com',
 *   secret: process.env.TOKEN_SECRET,
 * });
 * 
 * const result = await verifier.verify(accessToken);
 * if (result.valid) {
 *   console.log('User:', result.claims.sub);
 * } else {
 *   console.error('Invalid token:', result.error);
 * }
 * ```
 */
export class TokenVerifier {
    private options: Required<Omit<TokenVerifierOptions, 'jwksUri' | 'secret'>> & {
        jwksUri?: string;
        secret?: string;
    };

    constructor(options: TokenVerifierOptions) {
        this.options = {
            audience: options.audience,
            issuer: options.issuer,
            jwksUri: options.jwksUri,
            secret: options.secret,
            clockTolerance: options.clockTolerance ?? 60, // 60 seconds default
        };
    }

    /**
     * Verify an access token
     * 
     * Supports:
     * - JWT tokens signed with HS256 (symmetric)
     * - Simple opaque tokens (stored in memory)
     * 
     * @param token - The access token to verify
     * @returns Verification result with claims if valid
     */
    async verify(token: string): Promise<TokenVerificationResult> {
        if (!token) {
            return {
                valid: false,
                error: 'No token provided',
                errorCode: 'invalid_token',
            };
        }

        // Check if it's a JWT (has 3 parts separated by dots)
        const parts = token.split('.');
        if (parts.length === 3) {
            return this.verifyJWT(token, parts);
        }

        // Check opaque token store
        const storedClaims = opaqueTokenStore.get(token);
        if (storedClaims) {
            // Check expiration
            const now = Math.floor(Date.now() / 1000);
            if (storedClaims.exp && now > storedClaims.exp + this.options.clockTolerance) {
                opaqueTokenStore.delete(token);
                return {
                    valid: false,
                    error: 'Token expired',
                    errorCode: 'expired_token',
                };
            }

            return { valid: true, claims: storedClaims };
        }

        return {
            valid: false,
            error: 'Invalid or unknown token',
            errorCode: 'invalid_token',
        };
    }

    /**
     * Verify a JWT token
     */
    private async verifyJWT(token: string, parts: string[]): Promise<TokenVerificationResult> {
        try {
            // Decode header
            const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            // Verify signature
            if (header.alg === 'HS256' && this.options.secret) {
                const signatureInput = `${parts[0]}.${parts[1]}`;
                const expectedSignature = createHmac('sha256', this.options.secret)
                    .update(signatureInput)
                    .digest('base64url');

                if (parts[2] !== expectedSignature) {
                    return {
                        valid: false,
                        error: 'Invalid signature',
                        errorCode: 'invalid_token',
                    };
                }
            } else if (header.alg === 'RS256' || header.alg === 'ES256') {
                // For asymmetric algorithms, we'd need to fetch JWKS
                // This is a simplified implementation
                if (!this.options.jwksUri) {
                    return {
                        valid: false,
                        error: 'JWKS URI required for RS256/ES256',
                        errorCode: 'invalid_token',
                    };
                }
                // TODO: Implement JWKS verification
                // For now, skip signature verification for RS256/ES256
            } else if (header.alg !== 'none') {
                return {
                    valid: false,
                    error: `Unsupported algorithm: ${header.alg}`,
                    errorCode: 'invalid_token',
                };
            }

            const now = Math.floor(Date.now() / 1000);
            const clockTolerance = this.options.clockTolerance;

            // Check expiration
            if (payload.exp && now > payload.exp + clockTolerance) {
                return {
                    valid: false,
                    error: 'Token expired',
                    errorCode: 'expired_token',
                };
            }

            // Check not before
            if (payload.nbf && now < payload.nbf - clockTolerance) {
                return {
                    valid: false,
                    error: 'Token not yet valid',
                    errorCode: 'invalid_token',
                };
            }

            // Check issuer
            if (this.options.issuer && payload.iss !== this.options.issuer) {
                return {
                    valid: false,
                    error: `Invalid issuer: expected ${this.options.issuer}, got ${payload.iss}`,
                    errorCode: 'invalid_token',
                };
            }

            // Check audience
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

            return {
                valid: true,
                claims: payload as TokenClaims,
            };
        } catch (error: any) {
            return {
                valid: false,
                error: `Failed to parse JWT: ${error.message}`,
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
    hasScopes(claims: TokenClaims, requiredScopes: string[]): boolean {
        if (requiredScopes.length === 0) return true;

        const tokenScopes = typeof claims.scope === 'string'
            ? claims.scope.split(' ')
            : claims.scope || [];

        return requiredScopes.every(scope => tokenScopes.includes(scope));
    }
}

// ============================================================================
// Opaque Token Store (for non-JWT tokens)
// ============================================================================

/**
 * In-memory store for opaque tokens
 * Maps token string to claims
 */
const opaqueTokenStore = new Map<string, TokenClaims>();

/**
 * Store an opaque token for later verification
 */
export function storeOpaqueToken(token: string, claims: TokenClaims): void {
    opaqueTokenStore.set(token, claims);

    // Auto-cleanup when expired
    if (claims.exp) {
        const ttl = (claims.exp - Math.floor(Date.now() / 1000)) * 1000;
        if (ttl > 0) {
            setTimeout(() => opaqueTokenStore.delete(token), ttl);
        }
    }
}

/**
 * Remove an opaque token
 */
export function removeOpaqueToken(token: string): boolean {
    return opaqueTokenStore.delete(token);
}

/**
 * Clear all opaque tokens (for testing)
 */
export function clearOpaqueTokens(): void {
    opaqueTokenStore.clear();
}
