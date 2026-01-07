/**
 * OAuth Authorization Server
 * 
 * MCP-compliant OAuth 2.1 authorization server that can proxy to
 * external providers like GitHub, Google, etc.
 * 
 * Implements:
 * - RFC 8414: Authorization Server Metadata
 * - RFC 7591: Dynamic Client Registration
 * - RFC 8707: Resource Indicators
 * - OAuth 2.1 with PKCE
 */

import { randomUUID, createHmac, randomBytes, createHash } from 'crypto';
import express from 'express';
import type { Router, Request, Response } from 'express';
import type {
    OAuthAuthorizationServerOptions,
    AuthorizationServerMetadata,
    TokenClaims,
} from './types';
import { DynamicClientRegistration } from './dcr';
import { storeOpaqueToken } from './token-verifier';

/**
 * Pending authorization request
 */
interface PendingAuthRequest {
    clientId: string;
    redirectUri: string;
    scope: string;
    state?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    resource?: string;
    proxyState: string;
    pkceVerifier?: string;
    createdAt: number;
}

/**
 * Pending token exchange
 */
interface PendingTokenExchange {
    clientId: string;
    redirectUri: string;
    scope: string;
    resource?: string;
    upstreamTokens: {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
    };
    userInfo: Record<string, unknown>;

    createdAt: number;
    codeChallenge?: string;
    codeChallengeMethod?: string;
}

// In-memory stores (use Redis in production)
const pendingAuthRequests = new Map<string, PendingAuthRequest>();
const pendingTokenExchanges = new Map<string, PendingTokenExchange>();

// Cleanup interval
const CLEANUP_INTERVAL_MS = 60 * 1000;
const REQUEST_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cleanupExpiredRequests(): void {
    const now = Date.now();
    for (const [key, request] of pendingAuthRequests.entries()) {
        if (now - request.createdAt > REQUEST_TTL_MS) {
            pendingAuthRequests.delete(key);
        }
    }
    for (const [key, exchange] of pendingTokenExchanges.entries()) {
        if (now - exchange.createdAt > REQUEST_TTL_MS) {
            pendingTokenExchanges.delete(key);
        }
    }
}

setInterval(cleanupExpiredRequests, CLEANUP_INTERVAL_MS);

/**
 * OAuth Authorization Server for MCP
 * 
 * Creates Express routes for a complete OAuth 2.1 authorization server
 * that can proxy authentication to external providers.
 * 
 * @example
 * ```typescript
 * import express from 'express';
 * import { OAuthAuthorizationServer } from '@leanmcp/auth/server';
 * 
 * const app = express();
 * 
 * const authServer = new OAuthAuthorizationServer({
 *   issuer: 'https://mcp.example.com',
 *   sessionSecret: process.env.SESSION_SECRET!,
 *   upstreamProvider: {
 *     id: 'github',
 *     authorizationEndpoint: 'https://github.com/login/oauth/authorize',
 *     tokenEndpoint: 'https://github.com/login/oauth/access_token',
 *     clientId: process.env.GITHUB_CLIENT_ID!,
 *     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
 *     scopes: ['read:user', 'repo'],
 *     userInfoEndpoint: 'https://api.github.com/user',
 *   },
 *   scopesSupported: ['read:user', 'repo'],
 * });
 * 
 * app.use(authServer.getRouter());
 * ```
 */
export class OAuthAuthorizationServer {
    private options: OAuthAuthorizationServerOptions;
    private dcr: DynamicClientRegistration;

    constructor(options: OAuthAuthorizationServerOptions) {
        this.options = {
            enableDCR: true,
            tokenTTL: 3600, // 1 hour
            refreshTokenTTL: 2592000, // 30 days
            ...options,
        };

        this.dcr = new DynamicClientRegistration({
            clientIdPrefix: 'mcp_',
            clientSecretLength: 32,
            clientTTL: 0, // Never expires (ChatGPT manages its own clients)
        });
    }

    /**
     * Generate state parameter with HMAC signature
     */
    private generateState(): string {
        const nonce = randomUUID();
        const signature = createHmac('sha256', this.options.sessionSecret)
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

        const expectedSignature = createHmac('sha256', this.options.sessionSecret)
            .update(nonce)
            .digest('hex')
            .substring(0, 8);

        return signature === expectedSignature;
    }

    /**
     * Generate an authorization code
     */
    private generateAuthCode(): string {
        return randomBytes(32).toString('hex');
    }

    /**
     * Generate access token
     */
    private generateAccessToken(claims: Partial<TokenClaims>): string {
        const now = Math.floor(Date.now() / 1000);
        const payload: TokenClaims = {
            sub: claims.sub || 'unknown',
            iss: this.options.issuer,
            aud: claims.aud || this.options.issuer,
            iat: now,
            exp: now + (this.options.tokenTTL || 3600),
            scope: claims.scope,
            client_id: claims.client_id,
            ...claims,
        };

        // Generate opaque token and store claims
        const token = randomBytes(32).toString('hex');
        storeOpaqueToken(token, payload);

        return token;
    }

    /**
     * Get authorization server metadata (RFC 8414)
     */
    getMetadata(): AuthorizationServerMetadata {
        const issuer = this.options.issuer;
        return {
            issuer,
            authorization_endpoint: `${issuer}/oauth/authorize`,
            token_endpoint: `${issuer}/oauth/token`,
            registration_endpoint: this.options.enableDCR
                ? `${issuer}/oauth/register`
                : undefined,
            scopes_supported: this.options.scopesSupported || [],
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code', 'refresh_token'],
            code_challenge_methods_supported: ['S256'],
            token_endpoint_auth_methods_supported: [
                'client_secret_post',
                'client_secret_basic',
                'none',
            ],
        };
    }

    /**
     * Get Express router with all OAuth endpoints
     */
    getRouter(): Router {
        // Express is imported at the top level to support externalization in build
        const router: Router = express.Router();

        // RFC 8414: Authorization Server Metadata
        router.get('/.well-known/oauth-authorization-server', (_req: Request, res: Response) => {
            res.json(this.getMetadata());
        });

        // RFC 7591: Dynamic Client Registration
        if (this.options.enableDCR) {
            router.post('/oauth/register', express.json(), (req: Request, res: Response) => {
                try {
                    const response = this.dcr.register(req.body);
                    res.status(201).json(response);
                } catch (error: any) {
                    res.status(400).json({
                        error: 'invalid_client_metadata',
                        error_description: error.message,
                    });
                }
            });
        }

        // Authorization endpoint
        router.get('/oauth/authorize', (req: Request, res: Response) => {
            this.handleAuthorize(req, res);
        });

        // Callback from upstream provider
        router.get('/oauth/callback', async (req: Request, res: Response) => {
            await this.handleCallback(req, res);
        });

        // Token endpoint
        router.post('/oauth/token',
            express.urlencoded({ extended: true }),
            async (req: Request, res: Response) => {
                await this.handleToken(req, res);
            }
        );

        return router;
    }

    /**
     * Handle authorization request
     */
    private handleAuthorize(req: Request, res: Response): void {
        const {
            response_type,
            client_id,
            redirect_uri,
            scope,
            state,
            code_challenge,
            code_challenge_method,
            resource,
        } = req.query as Record<string, string>;

        // Validate required parameters
        if (response_type !== 'code') {
            res.status(400).json({
                error: 'unsupported_response_type',
                error_description: 'Only "code" response type is supported',
            });
            return;
        }

        if (!client_id) {
            res.status(400).json({
                error: 'invalid_request',
                error_description: 'client_id is required',
            });
            return;
        }

        // Validate client
        const client = this.dcr.getClient(client_id);
        if (!client) {
            res.status(400).json({
                error: 'invalid_client',
                error_description: 'Unknown client_id',
            });
            return;
        }

        // Validate redirect URI
        if (redirect_uri && !this.dcr.validateRedirectUri(client_id, redirect_uri)) {
            res.status(400).json({
                error: 'invalid_request',
                error_description: 'Invalid redirect_uri',
            });
            return;
        }

        // PKCE is required per MCP spec
        if (!code_challenge || code_challenge_method !== 'S256') {
            res.status(400).json({
                error: 'invalid_request',
                error_description: 'PKCE with S256 is required',
            });
            return;
        }

        // Check if we have an upstream provider
        if (!this.options.upstreamProvider) {
            res.status(500).json({
                error: 'server_error',
                error_description: 'No upstream provider configured',
            });
            return;
        }

        // Generate proxy state
        const proxyState = this.generateState();

        // Store pending request
        const pendingRequest: PendingAuthRequest = {
            clientId: client_id,
            redirectUri: redirect_uri || client.redirect_uris[0],
            scope: scope || '',
            state,
            codeChallenge: code_challenge,
            codeChallengeMethod: code_challenge_method,
            resource,
            proxyState,
            createdAt: Date.now(),
        };
        pendingAuthRequests.set(proxyState, pendingRequest);

        // Build upstream authorization URL
        const upstream = this.options.upstreamProvider;
        const authUrl = new URL(upstream.authorizationEndpoint);
        authUrl.searchParams.set('client_id', upstream.clientId);
        authUrl.searchParams.set('redirect_uri', `${this.options.issuer}/oauth/callback`);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('state', proxyState);
        authUrl.searchParams.set('scope', upstream.scopes?.join(' ') || scope || '');

        // Redirect to upstream provider
        res.redirect(authUrl.toString());
    }

    /**
     * Handle callback from upstream provider
     */
    private async handleCallback(req: Request, res: Response): Promise<void> {
        const { code, state, error, error_description } = req.query as Record<string, string>;

        // Handle error from upstream
        if (error) {
            const pending = state ? pendingAuthRequests.get(state) : undefined;
            pendingAuthRequests.delete(state || '');

            if (pending) {
                const redirectUri = new URL(pending.redirectUri);
                redirectUri.searchParams.set('error', error);
                if (error_description) {
                    redirectUri.searchParams.set('error_description', error_description);
                }
                if (pending.state) {
                    redirectUri.searchParams.set('state', pending.state);
                }
                res.redirect(redirectUri.toString());
            } else {
                res.status(400).json({ error, error_description });
            }
            return;
        }

        // Verify state
        if (!state || !this.verifyState(state)) {
            res.status(400).json({
                error: 'invalid_request',
                error_description: 'Invalid state parameter',
            });
            return;
        }

        // Get pending request
        const pending = pendingAuthRequests.get(state);
        if (!pending) {
            res.status(400).json({
                error: 'invalid_request',
                error_description: 'State not found - request may have expired',
            });
            return;
        }
        pendingAuthRequests.delete(state);

        if (!code) {
            res.status(400).json({
                error: 'invalid_request',
                error_description: 'Missing authorization code',
            });
            return;
        }

        try {
            // Exchange code with upstream provider
            const upstream = this.options.upstreamProvider!;
            const tokenResponse = await fetch(upstream.tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: `${this.options.issuer}/oauth/callback`,
                    client_id: upstream.clientId,
                    client_secret: upstream.clientSecret,
                }),
            });

            if (!tokenResponse.ok) {
                const errorBody = await tokenResponse.text();
                throw new Error(`Token exchange failed: ${errorBody}`);
            }

            const upstreamTokens = await tokenResponse.json();

            // Fetch user info if endpoint available
            let userInfo: Record<string, unknown> = {};
            if (upstream.userInfoEndpoint && upstreamTokens.access_token) {
                const userInfoResponse = await fetch(upstream.userInfoEndpoint, {
                    headers: {
                        'Authorization': `Bearer ${upstreamTokens.access_token}`,
                        'Accept': 'application/json',
                    },
                });
                if (userInfoResponse.ok) {
                    userInfo = await userInfoResponse.json();
                }
            }

            // Generate our own authorization code
            const authCode = this.generateAuthCode();

            // Store for token exchange
            pendingTokenExchanges.set(authCode, {
                clientId: pending.clientId,
                redirectUri: pending.redirectUri,
                scope: pending.scope,
                resource: pending.resource,
                upstreamTokens,
                userInfo,

                createdAt: Date.now(),
                codeChallenge: pending.codeChallenge,
                codeChallengeMethod: pending.codeChallengeMethod,
            });

            // Redirect back to client with our code
            const redirectUri = new URL(pending.redirectUri);
            redirectUri.searchParams.set('code', authCode);
            if (pending.state) {
                redirectUri.searchParams.set('state', pending.state);
            }

            res.redirect(redirectUri.toString());
        } catch (error: any) {
            console.error('Auth callback error:', error);

            const redirectUri = new URL(pending.redirectUri);
            redirectUri.searchParams.set('error', 'server_error');
            redirectUri.searchParams.set('error_description', error.message);
            if (pending.state) {
                redirectUri.searchParams.set('state', pending.state);
            }
            res.redirect(redirectUri.toString());
        }
    }

    /**
     * Handle token request
     */
    private async handleToken(req: Request, res: Response): Promise<void> {
        const {
            grant_type,
            code,
            redirect_uri,
            client_id,
            client_secret,
            code_verifier,
        } = req.body as Record<string, string>;

        // Validate client
        let clientId = client_id;

        // Check Authorization header for client credentials
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Basic ')) {
            const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
            const [basicClientId, basicSecret] = credentials.split(':');
            clientId = basicClientId;

            if (!this.dcr.validate(clientId, basicSecret)) {
                res.status(401).json({
                    error: 'invalid_client',
                    error_description: 'Invalid client credentials',
                });
                return;
            }
        } else if (client_id) {
            if (!this.dcr.validate(client_id, client_secret)) {
                res.status(401).json({
                    error: 'invalid_client',
                    error_description: 'Invalid client credentials',
                });
                return;
            }
        } else {
            res.status(401).json({
                error: 'invalid_client',
                error_description: 'Client authentication required',
            });
            return;
        }

        if (grant_type === 'authorization_code') {
            await this.handleAuthCodeGrant(res, clientId, code, redirect_uri, code_verifier);
        } else if (grant_type === 'refresh_token') {
            res.status(400).json({
                error: 'unsupported_grant_type',
                error_description: 'Refresh token grant not yet implemented',
            });
        } else {
            res.status(400).json({
                error: 'unsupported_grant_type',
                error_description: `Grant type "${grant_type}" not supported`,
            });
        }
    }

    /**
     * Handle authorization code grant
     */
    private async handleAuthCodeGrant(
        res: Response,
        clientId: string,
        code: string,
        redirectUri: string,
        codeVerifier: string
    ): Promise<void> {
        if (!code) {
            res.status(400).json({
                error: 'invalid_request',
                error_description: 'Missing authorization code',
            });
            return;
        }

        const pending = pendingTokenExchanges.get(code);
        if (!pending) {
            res.status(400).json({
                error: 'invalid_grant',
                error_description: 'Invalid or expired authorization code',
            });
            return;
        }
        pendingTokenExchanges.delete(code);

        // Verify client matches
        if (pending.clientId !== clientId) {
            res.status(400).json({
                error: 'invalid_grant',
                error_description: 'Client mismatch',
            });
            return;
        }

        // Verify redirect_uri matches
        if (redirectUri && pending.redirectUri !== redirectUri) {
            res.status(400).json({
                error: 'invalid_grant',
                error_description: 'Redirect URI mismatch',
            });
            return;
        }

        // PKCE verification
        if (pending.codeChallenge) {
            if (!codeVerifier) {
                res.status(400).json({
                    error: 'invalid_request',
                    error_description: 'Missing code_verifier',
                });
                return;
            }

            if (pending.codeChallengeMethod === 'S256') {
                const calculatedChallenge = createHash('sha256')
                    .update(codeVerifier)
                    .digest('base64url');

                if (calculatedChallenge !== pending.codeChallenge) {
                    res.status(400).json({
                        error: 'invalid_grant',
                        error_description: 'PKCE verification failed',
                    });
                    return;
                }
            } else {
                // Should not happen as we enforce S256 in authorize endpoint
                res.status(400).json({
                    error: 'invalid_request',
                    error_description: 'Unsupported PKCE method',
                });
                return;
            }
        }


        // Apply token mapper if configured
        let tokens = pending.upstreamTokens;
        if (this.options.tokenMapper) {
            tokens = await this.options.tokenMapper(pending.upstreamTokens, pending.userInfo);
        }

        // Extract user ID from userInfo
        const userId = (pending.userInfo.id || pending.userInfo.sub || pending.userInfo.login || 'unknown') as string;

        // Generate our access token
        const accessToken = this.generateAccessToken({
            sub: userId,
            aud: pending.resource || this.options.issuer,
            scope: pending.scope,
            client_id: clientId,
            // Include upstream user info
            name: pending.userInfo.name as string,
            email: pending.userInfo.email as string,
            picture: (pending.userInfo.avatar_url || pending.userInfo.picture) as string,
            // CRITICAL: Preserve upstream access token for tools to use
            upstream_token: tokens.access_token,
        });

        res.json({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: this.options.tokenTTL || 3600,
            scope: pending.scope,
            // Include upstream refresh token if available
            refresh_token: tokens.refresh_token,
        });
    }
}
