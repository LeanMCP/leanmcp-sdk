/**
 * OAuth Proxy
 * 
 * Enables MCP servers to authenticate users via external identity providers.
 * Acts as an intermediary between MCP clients and providers like Google, GitHub, etc.
 */

import { randomUUID, createHmac } from 'crypto';
import { generatePKCE } from '../client/pkce';
import type {
    OAuthProxyConfig,
    OAuthProviderConfig,
    PendingAuthRequest,
    ExternalTokens,
    ExternalUserInfo,
    MappedTokens,
    TokenMapper,
} from './types';

/**
 * Default token mapper - passes through external tokens
 */
const defaultTokenMapper: TokenMapper = async (
    externalTokens: ExternalTokens,
    userInfo: ExternalUserInfo,
): Promise<MappedTokens> => {
    return {
        access_token: externalTokens.access_token,
        token_type: externalTokens.token_type,
        expires_in: externalTokens.expires_in,
        refresh_token: externalTokens.refresh_token,
        user_id: userInfo.sub,
    };
};

/**
 * In-memory store for pending auth requests
 * In production, use Redis or similar for distributed deployments
 */
const pendingRequests = new Map<string, PendingAuthRequest>();
const REQUEST_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Clean up expired pending requests
 */
function cleanupExpiredRequests(): void {
    const now = Date.now();
    for (const [key, request] of pendingRequests.entries()) {
        if (now - request.createdAt > REQUEST_TTL_MS) {
            pendingRequests.delete(key);
        }
    }
}

// Run cleanup periodically
setInterval(cleanupExpiredRequests, 60 * 1000);

/**
 * OAuth Proxy class
 * 
 * Handles OAuth flows with external identity providers and maps
 * their tokens to internal MCP tokens.
 * 
 * @example
 * ```typescript
 * import { OAuthProxy, googleProvider, githubProvider } from '@leanmcp/auth/proxy';
 * 
 * const proxy = new OAuthProxy({
 *   baseUrl: 'https://mcp.example.com/auth',
 *   sessionSecret: process.env.SESSION_SECRET!,
 *   providers: [
 *     googleProvider({ clientId: '...', clientSecret: '...' }),
 *     githubProvider({ clientId: '...', clientSecret: '...' }),
 *   ],
 * });
 * 
 * // Express integration
 * app.get('/auth/authorize', (req, res) => {
 *   const url = proxy.handleAuthorize(req.query);
 *   res.redirect(url);
 * });
 * 
 * app.get('/auth/callback', async (req, res) => {
 *   const result = await proxy.handleCallback(req.query);
 *   res.redirect(result.redirectUri);
 * });
 * ```
 */
export class OAuthProxy {
    private config: Required<OAuthProxyConfig>;
    private providersMap: Map<string, OAuthProviderConfig>;

    constructor(config: OAuthProxyConfig) {
        this.config = {
            authorizePath: '/authorize',
            tokenPath: '/token',
            callbackPath: '/callback',
            tokenMapper: defaultTokenMapper,
            forwardPkce: true,
            ...config,
        };

        // Build provider lookup map
        this.providersMap = new Map();
        for (const provider of config.providers) {
            this.providersMap.set(provider.id, provider);
        }
    }

    /**
     * Get configured providers
     */
    getProviders(): OAuthProviderConfig[] {
        return this.config.providers;
    }

    /**
     * Get a provider by ID
     */
    getProvider(id: string): OAuthProviderConfig | undefined {
        return this.providersMap.get(id);
    }

    /**
     * Generate state parameter with signature
     */
    private generateState(): string {
        const nonce = randomUUID();
        const signature = createHmac('sha256', this.config.sessionSecret)
            .update(nonce)
            .digest('hex')
            .substring(0, 8);
        return `${nonce}.${signature}`;
    }

    /**
     * Verify state parameter signature
     */
    private verifyState(state: string): boolean {
        const [nonce, signature] = state.split('.');
        if (!nonce || !signature) return false;

        const expectedSignature = createHmac('sha256', this.config.sessionSecret)
            .update(nonce)
            .digest('hex')
            .substring(0, 8);

        return signature === expectedSignature;
    }

    /**
     * Handle authorization request
     * 
     * Redirects the user to the external provider's authorization page.
     * 
     * @param params - Request parameters
     * @returns URL to redirect the user to
     */
    handleAuthorize(params: {
        provider: string;
        redirect_uri: string;
        state?: string;
        scope?: string;
        code_challenge?: string;
        code_challenge_method?: string;
    }): string {
        const provider = this.providersMap.get(params.provider);
        if (!provider) {
            throw new Error(`Unknown provider: ${params.provider}`);
        }

        // Generate internal state for CSRF protection
        const proxyState = this.generateState();

        // Generate PKCE if provider supports it and we're forwarding
        let codeVerifier: string | undefined;
        let codeChallenge: string | undefined;

        if (provider.supportsPkce && this.config.forwardPkce) {
            const pkce = generatePKCE();
            codeVerifier = pkce.verifier;
            codeChallenge = pkce.challenge;
        }

        // Store pending request
        const pendingRequest: PendingAuthRequest = {
            providerId: params.provider,
            clientRedirectUri: params.redirect_uri,
            clientState: params.state,
            codeVerifier,
            proxyState,
            createdAt: Date.now(),
        };
        pendingRequests.set(proxyState, pendingRequest);

        // Build callback URL for this proxy
        const callbackUrl = `${this.config.baseUrl}${this.config.callbackPath}`;

        // Build authorization URL for external provider
        const authUrl = new URL(provider.authorizationEndpoint);
        authUrl.searchParams.set('client_id', provider.clientId);
        authUrl.searchParams.set('redirect_uri', callbackUrl);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('state', proxyState);

        // Use requested scope or provider default
        const scopes = params.scope?.split(' ') ?? provider.scopes;
        authUrl.searchParams.set('scope', scopes.join(' '));

        // Add PKCE if supported
        if (codeChallenge) {
            authUrl.searchParams.set('code_challenge', codeChallenge);
            authUrl.searchParams.set('code_challenge_method', 'S256');
        }

        // Add provider-specific params
        if (provider.authorizationParams) {
            for (const [key, value] of Object.entries(provider.authorizationParams)) {
                authUrl.searchParams.set(key, value);
            }
        }

        return authUrl.toString();
    }

    /**
     * Handle callback from external provider
     * 
     * Exchanges the authorization code for tokens and maps them.
     * 
     * @param params - Callback query parameters
     * @returns Result with redirect URI and tokens
     */
    async handleCallback(params: {
        code?: string;
        state?: string;
        error?: string;
        error_description?: string;
    }): Promise<{
        redirectUri: string;
        tokens?: MappedTokens;
        error?: string;
    }> {
        const { code, state, error, error_description } = params;

        // Handle error response from provider
        if (error) {
            const pendingRequest = state ? pendingRequests.get(state) : undefined;
            pendingRequests.delete(state ?? '');

            const redirectUri = new URL(pendingRequest?.clientRedirectUri ?? '/');
            redirectUri.searchParams.set('error', error);
            if (error_description) {
                redirectUri.searchParams.set('error_description', error_description);
            }
            if (pendingRequest?.clientState) {
                redirectUri.searchParams.set('state', pendingRequest.clientState);
            }

            return { redirectUri: redirectUri.toString(), error };
        }

        // Verify state
        if (!state || !this.verifyState(state)) {
            throw new Error('Invalid or missing state parameter');
        }

        // Get pending request
        const pendingRequest = pendingRequests.get(state);
        if (!pendingRequest) {
            throw new Error('State not found - authorization request expired');
        }
        pendingRequests.delete(state);

        if (!code) {
            throw new Error('Missing authorization code');
        }

        // Get provider
        const provider = this.providersMap.get(pendingRequest.providerId);
        if (!provider) {
            throw new Error(`Provider not found: ${pendingRequest.providerId}`);
        }

        // Exchange code for tokens
        const callbackUrl = `${this.config.baseUrl}${this.config.callbackPath}`;
        const externalTokens = await this.exchangeCodeForTokens(
            provider,
            code,
            callbackUrl,
            pendingRequest.codeVerifier
        );

        // Fetch user info if endpoint available
        let userInfo: ExternalUserInfo = { sub: 'unknown' };
        if (provider.userInfoEndpoint) {
            userInfo = await this.fetchUserInfo(provider, externalTokens.access_token);
        }

        // Map tokens
        const mappedTokens = await this.config.tokenMapper(externalTokens, userInfo, provider);

        // Build redirect URI with code (or tokens for implicit flow)
        const redirectUri = new URL(pendingRequest.clientRedirectUri);

        // Generate a new authorization code that represents the mapped tokens
        const internalCode = this.generateInternalCode(mappedTokens);
        redirectUri.searchParams.set('code', internalCode);

        if (pendingRequest.clientState) {
            redirectUri.searchParams.set('state', pendingRequest.clientState);
        }

        return { redirectUri: redirectUri.toString(), tokens: mappedTokens };
    }

    /**
     * Exchange authorization code for tokens with external provider
     */
    private async exchangeCodeForTokens(
        provider: OAuthProviderConfig,
        code: string,
        redirectUri: string,
        codeVerifier?: string
    ): Promise<ExternalTokens> {
        const tokenPayload: Record<string, string> = {
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: provider.clientId,
        };

        if (provider.tokenEndpointAuthMethod === 'client_secret_post') {
            tokenPayload.client_secret = provider.clientSecret;
        }

        if (codeVerifier) {
            tokenPayload.code_verifier = codeVerifier;
        }

        // Add provider-specific params
        if (provider.tokenParams) {
            for (const [key, value] of Object.entries(provider.tokenParams)) {
                tokenPayload[key] = value;
            }
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
        };

        // Add basic auth header if using client_secret_basic
        if (provider.tokenEndpointAuthMethod === 'client_secret_basic') {
            const credentials = Buffer.from(
                `${provider.clientId}:${provider.clientSecret}`
            ).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
        }

        const response = await fetch(provider.tokenEndpoint, {
            method: 'POST',
            headers,
            body: new URLSearchParams(tokenPayload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
        }

        return response.json();
    }

    /**
     * Fetch user info from external provider
     */
    private async fetchUserInfo(
        provider: OAuthProviderConfig,
        accessToken: string
    ): Promise<ExternalUserInfo> {
        if (!provider.userInfoEndpoint) {
            return { sub: 'unknown' };
        }

        const response = await fetch(provider.userInfoEndpoint, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            console.warn(`Failed to fetch user info: ${response.status}`);
            return { sub: 'unknown' };
        }

        const data = await response.json();

        // Normalize response (different providers use different fields)
        return {
            sub: data.sub ?? data.id ?? data.user_id ?? 'unknown',
            email: data.email,
            email_verified: data.email_verified ?? data.verified_email,
            name: data.name ?? data.login ?? data.display_name,
            picture: data.picture ?? data.avatar_url ?? data.avatar,
            raw: data,
        };
    }

    /**
     * Generate an internal authorization code for the mapped tokens
     * This code can be exchanged via the token endpoint
     */
    private generateInternalCode(tokens: MappedTokens): string {
        const code = randomUUID();
        const signature = createHmac('sha256', this.config.sessionSecret)
            .update(code)
            .update(JSON.stringify(tokens))
            .digest('hex')
            .substring(0, 16);

        // Store tokens temporarily
        // In production, use Redis with TTL
        const fullCode = `${code}.${signature}`;
        pendingRequests.set(fullCode, {
            providerId: '_internal',
            clientRedirectUri: '',
            proxyState: fullCode,
            createdAt: Date.now(),
            // @ts-expect-error - storing tokens in pending request
            _tokens: tokens,
        });

        // Cleanup after 5 minutes
        setTimeout(() => pendingRequests.delete(fullCode), 5 * 60 * 1000);

        return fullCode;
    }

    /**
     * Handle token request (exchange internal code for tokens)
     */
    async handleToken(params: {
        grant_type: string;
        code?: string;
        redirect_uri?: string;
        client_id?: string;
        client_secret?: string;
        refresh_token?: string;
    }): Promise<MappedTokens> {
        const { grant_type, code, refresh_token } = params;

        if (grant_type === 'authorization_code') {
            if (!code) {
                throw new Error('Missing code parameter');
            }

            const pending = pendingRequests.get(code) as any;
            if (!pending || !pending._tokens) {
                throw new Error('Invalid or expired code');
            }

            pendingRequests.delete(code);
            return pending._tokens;
        }

        if (grant_type === 'refresh_token') {
            if (!refresh_token) {
                throw new Error('Missing refresh_token parameter');
            }

            // In a real implementation, this would refresh with the external provider
            // and re-map the tokens
            throw new Error('Refresh token grant not implemented - use external provider directly');
        }

        throw new Error(`Unsupported grant_type: ${grant_type}`);
    }

    /**
     * Express/Connect middleware factory
     */
    createMiddleware(): {
        authorize: (req: any, res: any) => void;
        callback: (req: any, res: any) => Promise<void>;
        token: (req: any, res: any) => Promise<void>;
    } {
        return {
            authorize: (req, res) => {
                try {
                    const url = this.handleAuthorize(req.query);
                    res.redirect(url);
                } catch (error: any) {
                    res.status(400).json({ error: error.message });
                }
            },
            callback: async (req, res) => {
                try {
                    const result = await this.handleCallback(req.query);
                    res.redirect(result.redirectUri);
                } catch (error: any) {
                    res.status(400).json({ error: error.message });
                }
            },
            token: async (req, res) => {
                try {
                    const tokens = await this.handleToken(req.body);
                    res.json(tokens);
                } catch (error: any) {
                    res.status(400).json({ error: error.message });
                }
            },
        };
    }
}
