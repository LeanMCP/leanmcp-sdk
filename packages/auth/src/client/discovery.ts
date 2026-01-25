/**
 * OAuth Metadata Discovery (RFC 8414)
 *
 * Discovers OAuth 2.0 authorization server metadata from .well-known endpoints.
 * Supports both OAuth 2.0 and OpenID Connect discovery.
 */

/**
 * OAuth 2.0 Authorization Server Metadata
 * https://tools.ietf.org/html/rfc8414
 */
export interface OAuthMetadata {
  /** Authorization server's issuer identifier URL */
  issuer: string;

  /** URL of the authorization endpoint */
  authorization_endpoint: string;

  /** URL of the token endpoint */
  token_endpoint: string;

  /** URL of the dynamic client registration endpoint */
  registration_endpoint?: string;

  /** URL of the token revocation endpoint */
  revocation_endpoint?: string;

  /** URL of the token introspection endpoint */
  introspection_endpoint?: string;

  /** URL of the userinfo endpoint (OpenID Connect) */
  userinfo_endpoint?: string;

  /** URL of the JWKS endpoint */
  jwks_uri?: string;

  /** Scopes supported by the authorization server */
  scopes_supported?: string[];

  /** Response types supported */
  response_types_supported?: string[];

  /** Response modes supported */
  response_modes_supported?: string[];

  /** Grant types supported */
  grant_types_supported?: string[];

  /** Token endpoint auth methods supported */
  token_endpoint_auth_methods_supported?: string[];

  /** Code challenge methods supported (PKCE) */
  code_challenge_methods_supported?: string[];

  /** Whether server requires PKCE */
  require_pkce?: boolean;
}

/**
 * Discovery options
 */
export interface DiscoveryOptions {
  /** Request timeout in ms (default: 10000) */
  timeout?: number;

  /** Whether to cache the metadata (default: true) */
  cache?: boolean;

  /** Custom fetch function */
  fetch?: typeof fetch;
}

// In-memory cache for metadata
const metadataCache = new Map<string, { metadata: OAuthMetadata; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Discover OAuth metadata from a server URL
 *
 * Tries the following .well-known endpoints in order:
 * 1. /.well-known/oauth-authorization-server
 * 2. /.well-known/openid-configuration
 *
 * @example
 * ```typescript
 * const metadata = await discoverOAuthMetadata('https://auth.example.com');
 * console.log('Auth endpoint:', metadata.authorization_endpoint);
 * console.log('Supports PKCE:', metadata.code_challenge_methods_supported?.includes('S256'));
 * ```
 */
export async function discoverOAuthMetadata(
  serverUrl: string,
  options: DiscoveryOptions = {}
): Promise<OAuthMetadata> {
  const { timeout = 10000, cache = true, fetch: customFetch = fetch } = options;

  const normalizedUrl = serverUrl.replace(/\/+$/, '');

  // Check cache
  if (cache) {
    const cached = metadataCache.get(normalizedUrl);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.metadata;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Try OAuth 2.0 AS metadata first (RFC 8414)
    const oauthUrl = `${normalizedUrl}/.well-known/oauth-authorization-server`;
    try {
      const response = await customFetch(oauthUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const metadata = (await response.json()) as OAuthMetadata;
        cacheMetadata(normalizedUrl, metadata, cache);
        return metadata;
      }
    } catch {
      // Continue to OpenID Connect
    }

    // Try OpenID Connect discovery
    const oidcUrl = `${normalizedUrl}/.well-known/openid-configuration`;
    try {
      const response = await customFetch(oidcUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const metadata = (await response.json()) as OAuthMetadata;
        cacheMetadata(normalizedUrl, metadata, cache);
        return metadata;
      }
    } catch {
      // Continue to fallback
    }

    // Fallback: construct default endpoints
    const fallbackMetadata: OAuthMetadata = {
      issuer: normalizedUrl,
      authorization_endpoint: `${normalizedUrl}/authorize`,
      token_endpoint: `${normalizedUrl}/token`,
    };

    // Cache fallback metadata with shorter TTL
    if (cache) {
      metadataCache.set(normalizedUrl, {
        metadata: fallbackMetadata,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes for fallback
      });
    }

    return fallbackMetadata;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Cache metadata
 */
function cacheMetadata(url: string, metadata: OAuthMetadata, shouldCache: boolean): void {
  if (shouldCache) {
    metadataCache.set(url, {
      metadata,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }
}

/**
 * Clear cached metadata for a server
 */
export function clearMetadataCache(serverUrl?: string): void {
  if (serverUrl) {
    const normalizedUrl = serverUrl.replace(/\/+$/, '');
    metadataCache.delete(normalizedUrl);
  } else {
    metadataCache.clear();
  }
}

/**
 * Check if server supports a specific feature based on metadata
 */
export function serverSupports(
  metadata: OAuthMetadata,
  feature: 'pkce' | 'refresh_token' | 'dynamic_registration' | 'revocation'
): boolean {
  switch (feature) {
    case 'pkce':
      return metadata.code_challenge_methods_supported?.includes('S256') ?? false;
    case 'refresh_token':
      return metadata.grant_types_supported?.includes('refresh_token') ?? true; // Assume supported if not specified
    case 'dynamic_registration':
      return !!metadata.registration_endpoint;
    case 'revocation':
      return !!metadata.revocation_endpoint;
    default:
      return false;
  }
}

/**
 * Validate that metadata has required fields
 */
export function validateMetadata(metadata: OAuthMetadata): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!metadata.issuer) {
    errors.push('Missing required field: issuer');
  }

  if (!metadata.authorization_endpoint) {
    errors.push('Missing required field: authorization_endpoint');
  }

  if (!metadata.token_endpoint) {
    errors.push('Missing required field: token_endpoint');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
