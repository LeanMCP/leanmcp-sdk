/**
 * Dynamic Client Registration (RFC 7591) - Stateless Implementation
 *
 * Uses signed JWTs as client credentials for serverless compatibility.
 * No storage required - all client data is encoded in the credentials.
 */

import { randomUUID } from 'crypto';
import type {
  ClientRegistrationRequest,
  ClientRegistrationResponse,
  RegisteredClient,
  DynamicClientRegistrationOptions,
} from './types';
import { signJWT, verifyJWT, type JWTPayload } from './jwt-utils';

/**
 * Client credential JWT payload
 */
interface ClientCredentialPayload extends JWTPayload {
  // Client metadata
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  client_name?: string;
  token_endpoint_auth_method: string;
}

/**
 * Dynamic Client Registration handler (Stateless)
 *
 * Client credentials are JWTs signed by the server:
 * - client_id: JWT containing client metadata
 * - client_secret: HMAC signature derived from client_id
 *
 * This eliminates the need for storage while maintaining security.
 *
 * @example
 * ```typescript
 * const dcr = new DynamicClientRegistration({
 *   signingSecret: process.env.DCR_SIGNING_SECRET,
 *   clientIdPrefix: 'chatgpt_',
 *   clientTTL: 0, // Never expires
 * });
 *
 * // Register a client
 * const { client_id, client_secret } = dcr.register({
 *   redirect_uris: ['https://chatgpt.com/callback'],
 *   grant_types: ['authorization_code'],
 * });
 *
 * // Validate credentials (no storage lookup needed)
 * if (dcr.validate(client_id, client_secret)) {
 *   // Valid client
 * }
 * ```
 */
export class DynamicClientRegistration {
  private options: Required<DynamicClientRegistrationOptions> & { signingSecret: string };

  constructor(options: DynamicClientRegistrationOptions & { signingSecret: string }) {
    if (!options.signingSecret) {
      throw new Error('signingSecret is required for stateless DCR');
    }

    this.options = {
      clientIdPrefix: options.clientIdPrefix ?? 'mcp_',
      clientSecretLength: options.clientSecretLength ?? 32,
      clientTTL: options.clientTTL ?? 0, // 0 = never expires
      signingSecret: options.signingSecret,
    };
  }

  /**
   * Register a new OAuth client (stateless)
   *
   * @param request - Client registration request per RFC 7591
   * @returns Client registration response with JWT credentials
   */
  register(request: ClientRegistrationRequest): ClientRegistrationResponse {
    const now = Date.now();
    const nowSeconds = Math.floor(now / 1000);

    // Determine expiration
    const expiresAt = this.options.clientTTL > 0 ? now + this.options.clientTTL * 1000 : undefined;
    const expSeconds = expiresAt ? Math.floor(expiresAt / 1000) : 0;

    // Determine auth method
    const authMethod = request.token_endpoint_auth_method ?? 'client_secret_post';

    // Create client credential JWT payload
    const credentialPayload: ClientCredentialPayload = {
      sub: randomUUID(), // Unique client identifier
      iss: 'leanmcp-dcr',
      aud: 'leanmcp-oauth',
      iat: nowSeconds,
      exp: expSeconds || (undefined as any), // 0 means never expires
      redirect_uris: request.redirect_uris ?? [],
      grant_types: request.grant_types ?? ['authorization_code'],
      response_types: request.response_types ?? ['code'],
      client_name: request.client_name,
      token_endpoint_auth_method: authMethod,
    };

    // Sign JWT to create client_id
    const clientIdJWT = signJWT(credentialPayload, this.options.signingSecret);

    // Add prefix for readability
    const clientId = `${this.options.clientIdPrefix}${clientIdJWT}`;

    // Build response
    const response: ClientRegistrationResponse = {
      client_id: clientId,
      client_id_issued_at: nowSeconds,
    };

    // Only include secret for confidential clients
    if (authMethod !== 'none') {
      // Client secret is derived from client_id via HMAC
      // This ensures it can be validated without storage
      const clientSecret = this.deriveClientSecret(clientIdJWT);
      response.client_secret = clientSecret;
      response.client_secret_expires_at = expSeconds;
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
   * Validate client credentials (stateless)
   *
   * @param clientId - Client ID (JWT with prefix)
   * @param clientSecret - Client secret (optional for public clients)
   * @returns Whether credentials are valid
   */
  validate(clientId: string, clientSecret?: string): boolean {
    try {
      // Remove prefix
      const jwtWithoutPrefix = this.extractJWT(clientId);
      if (!jwtWithoutPrefix) return false;

      // Verify JWT signature and decode
      const payload = verifyJWT(
        jwtWithoutPrefix,
        this.options.signingSecret
      ) as ClientCredentialPayload;

      // JWT verification already checked expiration
      // If we get here, the JWT is valid and not expired

      // If client has auth method that requires secret, verify it
      if (payload.token_endpoint_auth_method && payload.token_endpoint_auth_method !== 'none') {
        if (!clientSecret) return false;

        const expectedSecret = this.deriveClientSecret(jwtWithoutPrefix);
        return clientSecret === expectedSecret;
      }

      // Public client (no secret required)
      return true;
    } catch (error) {
      // JWT verification failed (invalid signature, expired, etc.)
      return false;
    }
  }

  /**
   * Get a registered client by ID (stateless)
   */
  getClient(clientId: string): RegisteredClient | undefined {
    try {
      const jwtWithoutPrefix = this.extractJWT(clientId);
      if (!jwtWithoutPrefix) return undefined;

      const payload = verifyJWT(
        jwtWithoutPrefix,
        this.options.signingSecret
      ) as ClientCredentialPayload;

      // Convert JWT payload to RegisteredClient format
      return {
        client_id: clientId,
        client_secret:
          payload.token_endpoint_auth_method !== 'none'
            ? this.deriveClientSecret(jwtWithoutPrefix)
            : undefined,
        redirect_uris: payload.redirect_uris,
        grant_types: payload.grant_types,
        response_types: payload.response_types,
        client_name: payload.client_name,
        token_endpoint_auth_method: payload.token_endpoint_auth_method,
        created_at: payload.iat * 1000, // Convert to milliseconds
        expires_at: payload.exp ? payload.exp * 1000 : undefined,
      };
    } catch (error) {
      return undefined;
    }
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
   * Delete a client (no-op in stateless mode)
   *
   * In stateless mode, clients cannot be truly "deleted" because
   * their credentials are self-contained. They will expire naturally
   * or when the signing secret is rotated.
   */
  delete(clientId: string): boolean {
    // Return true if client exists (can be validated)
    return this.getClient(clientId) !== undefined;
  }

  /**
   * List all registered clients (not supported in stateless mode)
   */
  listClients(): RegisteredClient[] {
    throw new Error('listClients() is not supported in stateless DCR mode');
  }

  /**
   * Clear all clients (no-op in stateless mode)
   */
  clearAll(): void {
    // No-op: nothing to clear in stateless mode
  }

  /**
   * Extract JWT from prefixed client_id
   */
  private extractJWT(clientId: string): string | null {
    if (!clientId.startsWith(this.options.clientIdPrefix)) {
      return null;
    }
    return clientId.slice(this.options.clientIdPrefix.length);
  }

  /**
   * Derive client secret from client_id JWT
   *
   * Uses HMAC to create a deterministic secret that can be
   * validated without storage.
   */
  private deriveClientSecret(clientIdJWT: string): string {
    const { createHmac } = require('crypto');
    return createHmac('sha256', this.options.signingSecret).update(clientIdJWT).digest('hex');
  }
}
