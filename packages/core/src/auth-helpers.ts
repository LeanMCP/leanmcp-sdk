/**
 * MCP Authorization Helpers
 *
 * Utilities for implementing MCP authorization spec in tools.
 * Provides helpers for auth error responses and token verification.
 */

/**
 * Options for creating an auth error response
 */
export interface AuthErrorOptions {
  /** URL to the protected resource metadata */
  resourceMetadataUrl: string;
  /** OAuth error code */
  error?: 'invalid_token' | 'expired_token' | 'insufficient_scope';
  /** Human-readable error description */
  errorDescription?: string;
  /** Required scopes that were missing */
  requiredScopes?: string[];
}

/**
 * MCP-compliant auth error result structure
 */
export interface AuthErrorResult {
  content: { type: 'text'; text: string }[];
  _meta: { 'mcp/www_authenticate': string[] };
  isError: true;
}

/**
 * Create an MCP-compliant auth error result
 *
 * Returns the proper `_meta["mcp/www_authenticate"]` format that triggers
 * ChatGPT's OAuth linking UI.
 *
 * @example
 * ```typescript
 * @Tool({
 *   description: 'Fetch private data',
 *   securitySchemes: [{ type: 'oauth2', scopes: ['read:private'] }],
 * })
 * async fetchPrivateData(): Promise<any> {
 *   const token = this.getAccessToken();
 *
 *   if (!token) {
 *     return createAuthError('Please authenticate to access this feature', {
 *       resourceMetadataUrl: `${process.env.PUBLIC_URL}/.well-known/oauth-protected-resource`,
 *       error: 'invalid_token',
 *       errorDescription: 'No access token provided',
 *     });
 *   }
 *
 *   // Proceed with authenticated request...
 * }
 * ```
 *
 * @param message - User-facing error message
 * @param options - Auth error options
 * @returns MCP-compliant auth error result
 */
export function createAuthError(message: string, options: AuthErrorOptions): AuthErrorResult {
  const error = options.error || 'invalid_token';
  const errorDescription = options.errorDescription || message;

  // Build WWW-Authenticate header value per RFC 9728
  const wwwAuth = `Bearer resource_metadata="${options.resourceMetadataUrl}", error="${error}", error_description="${errorDescription}"`;

  return {
    content: [{ type: 'text', text: message }],
    _meta: {
      'mcp/www_authenticate': [wwwAuth],
    },
    isError: true,
  };
}

/**
 * Check if a result is an auth error
 */
export function isAuthError(result: unknown): result is AuthErrorResult {
  if (!result || typeof result !== 'object') return false;
  const r = result as Record<string, unknown>;
  return (
    r.isError === true &&
    r._meta !== undefined &&
    typeof r._meta === 'object' &&
    r._meta !== null &&
    'mcp/www_authenticate' in (r._meta as object)
  );
}

/**
 * Extract access token from Authorization header
 *
 * @param authHeader - The Authorization header value
 * @returns The bearer token, or null if not present/valid
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

/**
 * Protected Resource Metadata (RFC 9728)
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
}

/**
 * Generate Protected Resource Metadata document
 *
 * @param options - Metadata options
 * @returns RFC 9728 compliant metadata
 */
export function createProtectedResourceMetadata(options: {
  resource: string;
  authorizationServers?: string[];
  scopesSupported?: string[];
  documentationUrl?: string;
}): ProtectedResourceMetadata {
  return {
    resource: options.resource,
    authorization_servers: options.authorizationServers || [options.resource],
    scopes_supported: options.scopesSupported,
    resource_documentation: options.documentationUrl,
  };
}
