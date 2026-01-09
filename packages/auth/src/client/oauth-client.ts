/**
 * OAuth 2.1 Client for MCP
 * 
 * Handles browser-based OAuth flows with PKCE support.
 * Compatible with MCP servers and external OAuth providers.
 */

import { generatePKCE, type PKCEPair } from './pkce';
import { startCallbackServer, type CallbackServer } from './callback-server';
import { MemoryStorage } from '../storage/memory';
import type { TokenStorage, OAuthTokens, ClientRegistration } from '../storage/types';
import { isTokenExpired, withExpiresAt } from '../storage/types';

/**
 * OAuth client configuration
 */
export interface OAuthClientOptions {
    /** MCP server URL or OAuth authorization server URL */
    serverUrl: string;

    /** OAuth scopes to request */
    scopes?: string[];

    /** Client name for dynamic registration */
    clientName?: string;

    /** Token storage backend */
    storage?: TokenStorage;

    /** Pre-configured client credentials (skip dynamic registration) */
    clientId?: string;
    clientSecret?: string;

    /** Custom OAuth endpoints (auto-discovered if not provided) */
    authorizationEndpoint?: string;
    tokenEndpoint?: string;
    registrationEndpoint?: string;

    /** Enable PKCE (default: true) */
    pkceEnabled?: boolean;

    /** Automatically refresh tokens before expiry (default: true) */
    autoRefresh?: boolean;

    /** Seconds before expiry to trigger refresh (default: 60) */
    refreshBuffer?: number;

    /** Callback server port (default: auto) */
    callbackPort?: number;

    /** OAuth timeout in ms (default: 5 minutes) */
    timeout?: number;
}

/**
 * OAuth metadata from .well-known/oauth-authorization-server
 */
interface OAuthMetadata {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    registration_endpoint?: string;
    scopes_supported?: string[];
    response_types_supported?: string[];
    grant_types_supported?: string[];
    code_challenge_methods_supported?: string[];
}

/**
 * OAuth 2.1 client with PKCE and browser-based authentication
 * 
 * @example
 * ```typescript
 * const client = new OAuthClient({
 *   serverUrl: 'https://mcp.example.com',
 *   scopes: ['read', 'write'],
 * });
 * 
 * // Start browser-based OAuth flow
 * await client.authenticate();
 * 
 * // Get token for API calls
 * const token = await client.getValidToken();
 * ```
 */
export class OAuthClient {
    private serverUrl: string;
    private scopes: string[];
    private clientName: string;
    private storage: TokenStorage;
    private pkceEnabled: boolean;
    private autoRefresh: boolean;
    private refreshBuffer: number;
    private callbackPort?: number;
    private timeout: number;

    // OAuth endpoints
    private authorizationEndpoint?: string;
    private tokenEndpoint?: string;
    private registrationEndpoint?: string;

    // Pre-configured credentials
    private preConfiguredClientId?: string;
    private preConfiguredClientSecret?: string;

    // Runtime state
    private pendingRefresh?: Promise<OAuthTokens>;
    private metadata?: OAuthMetadata;

    constructor(options: OAuthClientOptions) {
        this.serverUrl = options.serverUrl.replace(/\/+$/, '');
        this.scopes = options.scopes ?? [];
        this.clientName = options.clientName ?? 'LeanMCP Client';
        this.storage = options.storage ?? new MemoryStorage();
        this.pkceEnabled = options.pkceEnabled ?? true;
        this.autoRefresh = options.autoRefresh ?? true;
        this.refreshBuffer = options.refreshBuffer ?? 60;
        this.callbackPort = options.callbackPort;
        this.timeout = options.timeout ?? 5 * 60 * 1000;

        // Custom endpoints
        this.authorizationEndpoint = options.authorizationEndpoint;
        this.tokenEndpoint = options.tokenEndpoint;
        this.registrationEndpoint = options.registrationEndpoint;

        // Pre-configured credentials
        this.preConfiguredClientId = options.clientId;
        this.preConfiguredClientSecret = options.clientSecret;
    }

    /**
     * Discover OAuth metadata from .well-known endpoint
     */
    private async discoverMetadata(): Promise<OAuthMetadata> {
        if (this.metadata) return this.metadata;

        // Try standard OAuth .well-known location
        const wellKnownUrl = `${this.serverUrl}/.well-known/oauth-authorization-server`;

        try {
            const response = await fetch(wellKnownUrl);
            if (response.ok) {
                this.metadata = await response.json();
                return this.metadata!;
            }
        } catch {
            // Ignore and try OpenID Connect
        }

        // Try OpenID Connect .well-known location
        try {
            const oidcUrl = `${this.serverUrl}/.well-known/openid-configuration`;
            const response = await fetch(oidcUrl);
            if (response.ok) {
                this.metadata = await response.json();
                return this.metadata!;
            }
        } catch {
            // Ignore
        }

        // Fall back to constructed endpoints
        this.metadata = {
            issuer: this.serverUrl,
            authorization_endpoint: this.authorizationEndpoint || `${this.serverUrl}/authorize`,
            token_endpoint: this.tokenEndpoint || `${this.serverUrl}/token`,
            registration_endpoint: this.registrationEndpoint,
        };

        return this.metadata;
    }

    /**
     * Get or register OAuth client credentials
     */
    private async getClientCredentials(redirectUri: string): Promise<ClientRegistration> {
        // Check for pre-configured credentials
        if (this.preConfiguredClientId) {
            return {
                client_id: this.preConfiguredClientId,
                client_secret: this.preConfiguredClientSecret,
            };
        }

        // Check storage
        const stored = await this.storage.getClientInfo(this.serverUrl);
        if (stored && (!stored.client_secret_expires_at || stored.client_secret_expires_at > Date.now() / 1000)) {
            return stored;
        }

        // Dynamic client registration
        const metadata = await this.discoverMetadata();
        if (!metadata.registration_endpoint) {
            throw new Error(
                'No client credentials configured and server does not support dynamic registration. ' +
                'Please provide clientId in OAuthClientOptions.'
            );
        }

        const registrationPayload = {
            client_name: this.clientName,
            redirect_uris: [redirectUri],
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            scope: this.scopes.join(' '),
        };

        const response = await fetch(metadata.registration_endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationPayload),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Client registration failed: ${error}`);
        }

        const registration: ClientRegistration = await response.json();
        await this.storage.setClientInfo(this.serverUrl, registration);

        return registration;
    }

    /**
     * Start the browser-based OAuth flow
     * 
     * Opens the user's browser to the authorization URL and waits for the callback.
     * 
     * @returns OAuth tokens
     */
    async authenticate(): Promise<OAuthTokens> {
        // Check for existing valid tokens
        const existing = await this.storage.getTokens(this.serverUrl);
        if (existing && !isTokenExpired(existing, this.refreshBuffer)) {
            return existing;
        }

        // Try to refresh if we have a refresh token
        if (existing?.refresh_token) {
            try {
                return await this.refreshTokens();
            } catch {
                // Refresh failed, proceed with full auth
            }
        }

        // Start callback server
        const callbackServer = await startCallbackServer({
            port: this.callbackPort,
            timeout: this.timeout,
        });

        try {
            // Get OAuth metadata and client credentials
            const metadata = await this.discoverMetadata();
            const clientCredentials = await this.getClientCredentials(callbackServer.redirectUri);

            // Generate PKCE if enabled
            let pkce: PKCEPair | undefined;
            if (this.pkceEnabled) {
                pkce = generatePKCE();
            }

            // Generate state for CSRF protection
            const state = crypto.randomUUID();

            // Build authorization URL
            const authUrl = new URL(metadata.authorization_endpoint);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('client_id', clientCredentials.client_id);
            authUrl.searchParams.set('redirect_uri', callbackServer.redirectUri);
            authUrl.searchParams.set('state', state);

            if (this.scopes.length > 0) {
                authUrl.searchParams.set('scope', this.scopes.join(' '));
            }

            if (pkce) {
                authUrl.searchParams.set('code_challenge', pkce.challenge);
                authUrl.searchParams.set('code_challenge_method', pkce.method);
            }

            // Open browser (requires dynamic import for 'open' package)
            const openBrowser = await this.openBrowser(authUrl.toString());
            if (!openBrowser) {
                console.log(`\nPlease open this URL in your browser:\n${authUrl.toString()}\n`);
            }

            // Wait for callback
            const result = await callbackServer.waitForCallback();

            // Verify state
            if (result.state !== state) {
                throw new Error('State mismatch - possible CSRF attack');
            }

            // Exchange code for tokens
            const tokens = await this.exchangeCodeForTokens(
                result.code,
                callbackServer.redirectUri,
                clientCredentials,
                pkce?.verifier
            );

            // Store tokens
            const enrichedTokens = withExpiresAt(tokens);
            await this.storage.setTokens(this.serverUrl, enrichedTokens);

            return enrichedTokens;

        } finally {
            await callbackServer.shutdown().catch(() => { });
        }
    }

    /**
     * Open URL in browser
     */
    private async openBrowser(url: string): Promise<boolean> {
        try {
            // Try to use 'open' package if available
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const open = require('open') as (url: string) => Promise<unknown>;
            await open(url);
            return true;
        } catch {
            // 'open' package not available, try platform-specific commands
            try {
                const { exec } = require('child_process');
                const platform = process.platform;

                if (platform === 'darwin') {
                    exec(`open "${url}"`);
                } else if (platform === 'win32') {
                    exec(`start "" "${url}"`);
                } else {
                    exec(`xdg-open "${url}"`);
                }
                return true;
            } catch {
                return false;
            }
        }
    }

    /**
     * Exchange authorization code for tokens
     */
    private async exchangeCodeForTokens(
        code: string,
        redirectUri: string,
        credentials: ClientRegistration,
        codeVerifier?: string
    ): Promise<OAuthTokens> {
        const metadata = await this.discoverMetadata();

        const tokenPayload: Record<string, string> = {
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: credentials.client_id,
        };

        if (credentials.client_secret) {
            tokenPayload.client_secret = credentials.client_secret;
        }

        if (codeVerifier) {
            tokenPayload.code_verifier = codeVerifier;
        }

        const response = await fetch(metadata.token_endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(tokenPayload),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token exchange failed: ${error}`);
        }

        return response.json();
    }

    /**
     * Refresh the access token using the refresh token
     */
    async refreshTokens(): Promise<OAuthTokens> {
        // Prevent concurrent refresh requests
        if (this.pendingRefresh) {
            return this.pendingRefresh;
        }

        this.pendingRefresh = this.doRefreshTokens();

        try {
            return await this.pendingRefresh;
        } finally {
            this.pendingRefresh = undefined;
        }
    }

    private async doRefreshTokens(): Promise<OAuthTokens> {
        const existing = await this.storage.getTokens(this.serverUrl);
        if (!existing?.refresh_token) {
            throw new Error('No refresh token available');
        }

        const metadata = await this.discoverMetadata();
        const credentials = await this.getClientCredentials('');

        const tokenPayload: Record<string, string> = {
            grant_type: 'refresh_token',
            refresh_token: existing.refresh_token,
            client_id: credentials.client_id,
        };

        if (credentials.client_secret) {
            tokenPayload.client_secret = credentials.client_secret;
        }

        const response = await fetch(metadata.token_endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(tokenPayload),
        });

        if (!response.ok) {
            // Clear stored tokens on refresh failure
            await this.storage.clearTokens(this.serverUrl);
            throw new Error('Token refresh failed');
        }

        const tokens: OAuthTokens = await response.json();

        // Some servers don't return refresh_token on refresh, keep the old one
        if (!tokens.refresh_token && existing.refresh_token) {
            tokens.refresh_token = existing.refresh_token;
        }

        const enrichedTokens = withExpiresAt(tokens);
        await this.storage.setTokens(this.serverUrl, enrichedTokens);

        return enrichedTokens;
    }

    /**
     * Get a valid access token, refreshing if necessary
     */
    async getValidToken(): Promise<string> {
        let tokens = await this.storage.getTokens(this.serverUrl);

        if (!tokens) {
            throw new Error('Not authenticated. Call authenticate() first.');
        }

        // Auto-refresh if enabled and token is expiring
        if (this.autoRefresh && isTokenExpired(tokens, this.refreshBuffer)) {
            if (tokens.refresh_token) {
                tokens = await this.refreshTokens();
            } else {
                throw new Error('Token expired and no refresh token available. Re-authenticate required.');
            }
        }

        return tokens.access_token;
    }

    /**
     * Get current tokens (may be expired)
     */
    async getTokens(): Promise<OAuthTokens | null> {
        return this.storage.getTokens(this.serverUrl);
    }

    /**
     * Check if we have valid (non-expired) tokens
     */
    async isAuthenticated(): Promise<boolean> {
        const tokens = await this.storage.getTokens(this.serverUrl);
        if (!tokens) return false;

        // Consider authenticated if token is valid or we have a refresh token
        return !isTokenExpired(tokens, this.refreshBuffer) || !!tokens.refresh_token;
    }

    /**
     * Clear stored tokens and log out
     */
    async logout(): Promise<void> {
        await this.storage.clearTokens(this.serverUrl);
        await this.storage.clearClientInfo(this.serverUrl);
    }

    /**
     * Create an auth handler for HTTP requests
     * 
     * @example
     * ```typescript
     * const authHandler = client.asAuthHandler();
     * const authedRequest = await authHandler(request);
     * ```
     */
    asAuthHandler(): (request: Request) => Promise<Request> {
        return async (request: Request): Promise<Request> => {
            const token = await this.getValidToken();

            const headers = new Headers(request.headers);
            headers.set('Authorization', `Bearer ${token}`);

            return new Request(request.url, {
                method: request.method,
                headers,
                body: request.body,
            });
        };
    }
}
