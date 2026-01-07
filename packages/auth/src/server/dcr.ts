/**
 * Dynamic Client Registration (RFC 7591)
 * 
 * Handles registration of OAuth clients at runtime.
 * ChatGPT registers a fresh client for each session.
 */

import { randomBytes, randomUUID } from 'crypto';
import type {
    ClientRegistrationRequest,
    ClientRegistrationResponse,
    RegisteredClient,
    DynamicClientRegistrationOptions,
} from './types';

/**
 * In-memory client store
 * In production, use Redis or a database
 */
const clients = new Map<string, RegisteredClient>();

/**
 * Cleanup expired clients periodically
 */
function cleanupExpiredClients(): void {
    const now = Date.now();
    for (const [clientId, client] of clients.entries()) {
        if (client.expires_at && now > client.expires_at) {
            clients.delete(clientId);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredClients, 5 * 60 * 1000);

/**
 * Dynamic Client Registration handler
 * 
 * @example
 * ```typescript
 * const dcr = new DynamicClientRegistration({
 *   clientIdPrefix: 'chatgpt_',
 *   clientSecretLength: 32,
 *   clientTTL: 3600, // 1 hour
 * });
 * 
 * // Register a client
 * const { client_id, client_secret } = dcr.register({
 *   redirect_uris: ['https://chatgpt.com/callback'],
 *   grant_types: ['authorization_code'],
 * });
 * 
 * // Validate credentials
 * if (dcr.validate(client_id, client_secret)) {
 *   // Valid client
 * }
 * ```
 */
export class DynamicClientRegistration {
    private options: Required<DynamicClientRegistrationOptions>;

    constructor(options: DynamicClientRegistrationOptions = {}) {
        this.options = {
            clientIdPrefix: options.clientIdPrefix ?? 'mcp_',
            clientSecretLength: options.clientSecretLength ?? 32,
            clientTTL: options.clientTTL ?? 0, // 0 = never expires
        };
    }

    /**
     * Register a new OAuth client
     * 
     * @param request - Client registration request per RFC 7591
     * @returns Client registration response with credentials
     */
    register(request: ClientRegistrationRequest): ClientRegistrationResponse {
        const clientId = `${this.options.clientIdPrefix}${randomUUID().replace(/-/g, '')}`;
        const clientSecret = randomBytes(this.options.clientSecretLength).toString('hex');

        const now = Date.now();
        const expiresAt = this.options.clientTTL > 0
            ? now + (this.options.clientTTL * 1000)
            : undefined;

        // Determine auth method
        const authMethod = request.token_endpoint_auth_method ?? 'client_secret_post';

        // Store client
        const client: RegisteredClient = {
            client_id: clientId,
            client_secret: authMethod !== 'none' ? clientSecret : undefined,
            redirect_uris: request.redirect_uris ?? [],
            grant_types: request.grant_types ?? ['authorization_code'],
            response_types: request.response_types ?? ['code'],
            client_name: request.client_name,
            token_endpoint_auth_method: authMethod,
            created_at: now,
            expires_at: expiresAt,
        };

        clients.set(clientId, client);

        // Build response
        const response: ClientRegistrationResponse = {
            client_id: clientId,
            client_id_issued_at: Math.floor(now / 1000),
        };

        // Only include secret for confidential clients
        if (authMethod !== 'none') {
            response.client_secret = clientSecret;
            response.client_secret_expires_at = expiresAt
                ? Math.floor(expiresAt / 1000)
                : 0; // 0 = never expires
        }

        // Echo back registration request fields
        if (request.redirect_uris) response.redirect_uris = request.redirect_uris;
        if (request.grant_types) response.grant_types = request.grant_types;
        if (request.response_types) response.response_types = request.response_types;
        if (request.client_name) response.client_name = request.client_name;
        if (authMethod) response.token_endpoint_auth_method = authMethod;

        return response;
    }

    /**
     * Validate client credentials
     * 
     * @param clientId - Client ID
     * @param clientSecret - Client secret (optional for public clients)
     * @returns Whether credentials are valid
     */
    validate(clientId: string, clientSecret?: string): boolean {
        const client = clients.get(clientId);
        if (!client) return false;

        // Check expiration
        if (client.expires_at && Date.now() > client.expires_at) {
            clients.delete(clientId);
            return false;
        }

        // If client has a secret, verify it
        if (client.client_secret) {
            return client.client_secret === clientSecret;
        }

        // Public client (no secret required)
        return true;
    }

    /**
     * Get a registered client by ID
     */
    getClient(clientId: string): RegisteredClient | undefined {
        const client = clients.get(clientId);
        if (!client) return undefined;

        // Check expiration
        if (client.expires_at && Date.now() > client.expires_at) {
            clients.delete(clientId);
            return undefined;
        }

        return client;
    }

    /**
     * Validate redirect URI for a client
     */
    validateRedirectUri(clientId: string, redirectUri: string): boolean {
        const client = this.getClient(clientId);
        if (!client) return false;

        // If no redirect URIs registered, allow any (not recommended)
        if (client.redirect_uris.length === 0) return true;

        // Exact match required per OAuth 2.1
        return client.redirect_uris.includes(redirectUri);
    }

    /**
     * Delete a client
     */
    delete(clientId: string): boolean {
        return clients.delete(clientId);
    }

    /**
     * Get all registered clients (for debugging)
     */
    listClients(): RegisteredClient[] {
        return Array.from(clients.values());
    }

    /**
     * Clear all clients (for testing)
     */
    clearAll(): void {
        clients.clear();
    }
}
