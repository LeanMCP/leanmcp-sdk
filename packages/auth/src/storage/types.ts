/**
 * Token Storage Types
 * 
 * Defines interfaces for storing OAuth tokens across different backends
 * (memory, file, keychain, browser localStorage, etc.)
 */

/**
 * OAuth 2.0/2.1 token response
 */
export interface OAuthTokens {
    /** The access token issued by the authorization server */
    access_token: string;

    /** Token type (usually "Bearer") */
    token_type: string;

    /** Lifetime in seconds of the access token */
    expires_in?: number;

    /** Refresh token for obtaining new access tokens */
    refresh_token?: string;

    /** ID token (OpenID Connect) */
    id_token?: string;

    /** Scope granted by the authorization server */
    scope?: string;

    /** Computed: Unix timestamp when token expires */
    expires_at?: number;
}

/**
 * OAuth client registration information
 * Used for Dynamic Client Registration (RFC 7591)
 */
export interface ClientRegistration {
    /** OAuth client identifier */
    client_id: string;

    /** OAuth client secret (for confidential clients) */
    client_secret?: string;

    /** Unix timestamp when client secret expires */
    client_secret_expires_at?: number;

    /** Token for accessing registration endpoint */
    registration_access_token?: string;

    /** Client metadata from registration */
    metadata?: Record<string, unknown>;
}

/**
 * Stored session combining tokens and client info
 */
export interface StoredSession {
    /** Server URL this session is for */
    serverUrl: string;

    /** OAuth tokens */
    tokens: OAuthTokens;

    /** Client registration info (if dynamic registration used) */
    clientInfo?: ClientRegistration;

    /** Unix timestamp when session was created */
    createdAt: number;

    /** Unix timestamp when session was last updated */
    updatedAt: number;
}

/**
 * Token storage interface
 * 
 * Implement this interface to create custom storage backends.
 * All operations should be async to support various backends.
 */
export interface TokenStorage {
    /**
     * Get stored tokens for a server
     * @param serverUrl - The MCP server URL
     * @returns Tokens if found, null otherwise
     */
    getTokens(serverUrl: string): Promise<OAuthTokens | null>;

    /**
     * Store tokens for a server
     * @param serverUrl - The MCP server URL
     * @param tokens - OAuth tokens to store
     */
    setTokens(serverUrl: string, tokens: OAuthTokens): Promise<void>;

    /**
     * Clear tokens for a server
     * @param serverUrl - The MCP server URL
     */
    clearTokens(serverUrl: string): Promise<void>;

    /**
     * Get stored client registration for a server
     * @param serverUrl - The MCP server URL
     * @returns Client info if found, null otherwise
     */
    getClientInfo(serverUrl: string): Promise<ClientRegistration | null>;

    /**
     * Store client registration for a server
     * @param serverUrl - The MCP server URL
     * @param info - Client registration info
     */
    setClientInfo(serverUrl: string, info: ClientRegistration): Promise<void>;

    /**
     * Clear client registration for a server
     * @param serverUrl - The MCP server URL
     */
    clearClientInfo(serverUrl: string): Promise<void>;

    /**
     * Clear all stored data
     */
    clearAll(): Promise<void>;

    /**
     * Get all stored sessions (optional)
     * @returns Array of stored sessions
     */
    getAllSessions?(): Promise<StoredSession[]>;
}

/**
 * Check if tokens are expired or about to expire
 * @param tokens - OAuth tokens to check
 * @param bufferSeconds - Seconds before expiry to consider expired (default: 60)
 * @returns True if tokens are expired or will expire within buffer
 */
export function isTokenExpired(tokens: OAuthTokens, bufferSeconds: number = 60): boolean {
    if (!tokens.expires_at && !tokens.expires_in) {
        // No expiry info, assume not expired
        return false;
    }

    const expiresAt = tokens.expires_at ?? (Date.now() / 1000 + (tokens.expires_in ?? 0));
    const now = Date.now() / 1000;

    return expiresAt <= now + bufferSeconds;
}

/**
 * Compute expires_at from expires_in if not present
 * @param tokens - OAuth tokens to enhance
 * @returns Tokens with expires_at computed
 */
export function withExpiresAt(tokens: OAuthTokens): OAuthTokens {
    if (tokens.expires_at || !tokens.expires_in) {
        return tokens;
    }

    return {
        ...tokens,
        expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
    };
}
