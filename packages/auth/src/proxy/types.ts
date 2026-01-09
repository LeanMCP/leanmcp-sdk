/**
 * OAuth Proxy Types
 * 
 * Types and interfaces for the OAuth proxy that enables
 * MCP servers to authenticate via external identity providers.
 */

/**
 * OAuth provider configuration
 */
export interface OAuthProviderConfig {
    /** Display name of the provider */
    name: string;

    /** Provider identifier (e.g., 'google', 'github') */
    id: string;

    /** OAuth authorization endpoint */
    authorizationEndpoint: string;

    /** OAuth token endpoint */
    tokenEndpoint: string;

    /** UserInfo endpoint (optional, for fetching user profile) */
    userInfoEndpoint?: string;

    /** OAuth client ID */
    clientId: string;

    /** OAuth client secret */
    clientSecret: string;

    /** Scopes to request */
    scopes: string[];

    /** Token endpoint authentication method */
    tokenEndpointAuthMethod?: 'client_secret_basic' | 'client_secret_post';

    /** Whether the provider supports PKCE */
    supportsPkce?: boolean;

    /** Custom parameters for authorization */
    authorizationParams?: Record<string, string>;

    /** Custom parameters for token exchange */
    tokenParams?: Record<string, string>;
}

/**
 * User info from external provider
 */
export interface ExternalUserInfo {
    /** User's unique ID from the provider */
    sub: string;

    /** User's email address */
    email?: string;

    /** Whether email is verified */
    email_verified?: boolean;

    /** User's display name */
    name?: string;

    /** User's profile picture URL */
    picture?: string;

    /** Provider-specific raw data */
    raw?: Record<string, unknown>;
}

/**
 * Token mapping function
 * Maps external provider tokens to internal MCP tokens
 */
export type TokenMapper = (
    externalTokens: ExternalTokens,
    userInfo: ExternalUserInfo,
    provider: OAuthProviderConfig
) => Promise<MappedTokens>;

/**
 * External provider tokens
 */
export interface ExternalTokens {
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    id_token?: string;
    scope?: string;
}

/**
 * Internal MCP tokens after mapping
 */
export interface MappedTokens {
    /** Access token to use with MCP server */
    access_token: string;

    /** Token type (usually Bearer) */
    token_type: string;

    /** Token lifetime in seconds */
    expires_in?: number;

    /** Refresh token for obtaining new tokens */
    refresh_token?: string;

    /** MCP user ID */
    user_id?: string;
}

/**
 * OAuth proxy configuration
 */
export interface OAuthProxyConfig {
    /** Base URL where the proxy is hosted */
    baseUrl: string;

    /** Path for authorization endpoint (default: /authorize) */
    authorizePath?: string;

    /** Path for token endpoint (default: /token) */
    tokenPath?: string;

    /** Path for callback from external provider (default: /callback) */
    callbackPath?: string;

    /** Configured upstream providers */
    providers: OAuthProviderConfig[];

    /** Custom token mapper (optional) */
    tokenMapper?: TokenMapper;

    /** Session storage for OAuth state */
    sessionSecret: string;

    /** Whether to forward PKCE to upstream provider */
    forwardPkce?: boolean;
}

/**
 * Pending authorization request
 */
export interface PendingAuthRequest {
    /** Provider ID */
    providerId: string;

    /** Original client redirect URI */
    clientRedirectUri: string;

    /** Original client state */
    clientState?: string;

    /** PKCE code verifier (if forwarding PKCE) */
    codeVerifier?: string;

    /** Internal state for proxy */
    proxyState: string;

    /** Created timestamp */
    createdAt: number;
}
