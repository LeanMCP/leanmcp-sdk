/**
 * Server-side OAuth types for MCP Authorization
 * 
 * Types for Authorization Server, Dynamic Client Registration,
 * and Token Verification per MCP spec.
 */

// ============================================================================
// RFC 7591 - Dynamic Client Registration
// ============================================================================

/**
 * Client registration request (RFC 7591 Section 2)
 */
export interface ClientRegistrationRequest {
    /** Array of redirect URIs */
    redirect_uris?: string[];
    /** OAuth 2.0 grant types */
    grant_types?: ('authorization_code' | 'refresh_token' | 'client_credentials')[];
    /** OAuth 2.0 response types */
    response_types?: ('code' | 'token')[];
    /** Client name */
    client_name?: string;
    /** Client URI */
    client_uri?: string;
    /** Logo URI */
    logo_uri?: string;
    /** Token endpoint auth method */
    token_endpoint_auth_method?: 'none' | 'client_secret_post' | 'client_secret_basic';
    /** Scope */
    scope?: string;
    /** Contacts */
    contacts?: string[];
    /** Software ID */
    software_id?: string;
    /** Software version */
    software_version?: string;
}

/**
 * Client registration response (RFC 7591 Section 3.2.1)
 */
export interface ClientRegistrationResponse {
    /** Issued client ID */
    client_id: string;
    /** Issued client secret (for confidential clients) */
    client_secret?: string;
    /** Timestamp when client_id was issued */
    client_id_issued_at?: number;
    /** Timestamp when client_secret expires (0 = never) */
    client_secret_expires_at?: number;
    /** All registration request fields echoed back */
    redirect_uris?: string[];
    grant_types?: string[];
    response_types?: string[];
    client_name?: string;
    token_endpoint_auth_method?: string;
}

/**
 * Registered client stored in memory/storage
 */
export interface RegisteredClient {
    client_id: string;
    client_secret?: string;
    redirect_uris: string[];
    grant_types: string[];
    response_types: string[];
    client_name?: string;
    token_endpoint_auth_method: string;
    created_at: number;
    expires_at?: number;
}

// ============================================================================
// RFC 8414 - Authorization Server Metadata
// ============================================================================

/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414)
 */
export interface AuthorizationServerMetadata {
    /** Authorization server's issuer identifier URL */
    issuer: string;
    /** URL of the authorization endpoint */
    authorization_endpoint: string;
    /** URL of the token endpoint */
    token_endpoint: string;
    /** URL of the dynamic client registration endpoint */
    registration_endpoint?: string;
    /** URL of the JWKS endpoint */
    jwks_uri?: string;
    /** Supported scopes */
    scopes_supported?: string[];
    /** Supported response types */
    response_types_supported: string[];
    /** Supported grant types */
    grant_types_supported?: string[];
    /** Supported PKCE code challenge methods */
    code_challenge_methods_supported?: string[];
    /** Supported token endpoint auth methods */
    token_endpoint_auth_methods_supported?: string[];
    /** Service documentation URL */
    service_documentation?: string;
}

// ============================================================================
// RFC 9728 - Protected Resource Metadata
// ============================================================================

/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728)
 */
export interface ProtectedResourceMetadata {
    /** Canonical resource identifier */
    resource: string;
    /** Authorization servers that can authorize access */
    authorization_servers: string[];
    /** Scopes supported by this resource */
    scopes_supported?: string[];
    /** Resource documentation URL */
    resource_documentation?: string;
    /** Token endpoint auth methods supported */
    token_endpoint_auth_methods_supported?: string[];
    /** Introspection endpoint */
    introspection_endpoint?: string;
}

// ============================================================================
// Token Types
// ============================================================================

/**
 * Token claims extracted from access token
 */
export interface TokenClaims {
    /** Subject (user ID) */
    sub: string;
    /** Issuer */
    iss: string;
    /** Audience (resource server) */
    aud: string | string[];
    /** Expiration timestamp */
    exp: number;
    /** Issued at timestamp */
    iat: number;
    /** Scopes (space-separated or array) */
    scope?: string | string[];
    /** Client ID */
    client_id?: string;
    /** Additional claims */
    [key: string]: unknown;
}

/**
 * Token verification result
 */
export interface TokenVerificationResult {
    /** Whether token is valid */
    valid: boolean;
    /** Extracted claims (if valid) */
    claims?: JWTPayload;
    /** Decrypted upstream token (if present and valid) */
    upstreamToken?: string;
    /** Error message (if invalid) */
    error?: string;
    /** Error code */
    errorCode?: 'invalid_token' | 'expired_token' | 'insufficient_scope';
}

// ============================================================================
// Authorization Server Options
// ============================================================================

/**
 * Types for OAuth Authorization Server
 */

import type { EncryptedToken, JWTPayload } from './jwt-utils';

// Re-export for convenience
export type { EncryptedToken, JWTPayload };

export interface OAuthAuthorizationServerOptions {
    /** Issuer URL (e.g., https://auth.example.com) */
    issuer: string;
    /** Session secret for signing state parameters */
    sessionSecret: string;
    /** JWT signing secret (for HS256) */
    jwtSigningSecret?: string;
    /** JWT encryption secret (32 bytes for AES-256) */
    jwtEncryptionSecret?: Buffer;
    /** Upstream OAuth provider configuration (e.g., GitHub, Google) */
    upstreamProvider?: {
        id: string;
        authorizationEndpoint: string;
        tokenEndpoint: string;
        clientId: string;
        clientSecret: string;
        scopes?: string[];
        userInfoEndpoint?: string;
    };
    /** Scopes to advertise */
    scopesSupported?: string[];
    /** Enable dynamic client registration */
    enableDCR?: boolean;
    /** Token TTL in seconds (default: 3600) */
    tokenTTL?: number;
    /** Refresh token TTL in seconds (default: 2592000 = 30 days) */
    refreshTokenTTL?: number;
    /** Custom token mapper */
    tokenMapper?: (
        upstreamTokens: { access_token: string; refresh_token?: string; expires_in?: number },
        userInfo: Record<string, unknown>
    ) => Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>;
}

/**
 * DCR options
 */
export interface DynamicClientRegistrationOptions {
    /** Client ID prefix */
    clientIdPrefix?: string;
    /** Client secret length in bytes */
    clientSecretLength?: number;
    /** Client TTL in seconds (0 = never expires) */
    clientTTL?: number;
}

/**
 * Token verifier options
 */
export interface TokenVerifierOptions {
    /** Expected audience (resource server URL) */
    audience: string;
    /** Expected issuer */
    issuer: string;
    /** JWKS URI for RS256/ES256 signature verification */
    jwksUri?: string;
    /** Symmetric secret for HS256 tokens */
    secret?: string;
    /** Encryption secret for decrypting upstream tokens (32 bytes) */
    encryptionSecret?: Buffer;
    /** Clock tolerance in seconds for exp/nbf checks */
    clockTolerance?: number;
}
