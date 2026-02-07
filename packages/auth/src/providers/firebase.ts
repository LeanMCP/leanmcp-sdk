import axios from 'axios';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import { AuthProviderBase } from '../index';

/**
 * Firebase Authentication provider implementation
 *
 * Supports:
 *  - ID Token verification via Google's public keys
 *  - Token refresh using Firebase Auth REST API
 *  - User info extraction from ID tokens
 *
 * Firebase uses Google's JWKS for token verification and provides
 * refresh token support through the secure token API.
 */
export class AuthFirebase extends AuthProviderBase {
  private projectId: string = '';
  private apiKey: string = '';
  private jwksCache: any[] | null = null;
  private jwksCacheExpiry: number = 0;

  /**
   * Google's public keys URL for Firebase token verification
   * These rotate regularly, so we cache with respect to Cache-Control headers
   */
  private readonly GOOGLE_JWKS_URL =
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

  /**
   * Firebase Auth REST API for token refresh
   * Docs: https://firebase.google.com/docs/reference/rest/auth
   */
  private readonly SECURE_TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';

  /**
   * Initialize Firebase Auth Provider
   *
   * @param config - Configuration options
   * @param config.projectId - Firebase project ID (required)
   * @param config.apiKey - Firebase Web API key (required for token refresh)
   */
  async init(config?: { projectId?: string; apiKey?: string }): Promise<void> {
    this.projectId = config?.projectId || process.env.FIREBASE_PROJECT_ID || '';
    this.apiKey = config?.apiKey || process.env.FIREBASE_API_KEY || '';

    if (!this.projectId) {
      throw new Error(
        'Firebase config missing: projectId is required. ' +
          'Provide it in config or set FIREBASE_PROJECT_ID environment variable.'
      );
    }

    if (!this.apiKey) {
      console.warn(
        '[Firebase Auth] API key not provided. Token refresh will not be available. ' +
          'Set FIREBASE_API_KEY environment variable or pass apiKey in config.'
      );
    }
  }

  /**
   * Refresh an authentication token using Firebase's secure token API
   *
   * @param refreshToken - The refresh token obtained during sign-in
   * @returns New tokens including access_token, id_token, and refresh_token
   */
  async refreshToken(refreshToken: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error(
        'Firebase API key is required for token refresh. ' +
          'Set FIREBASE_API_KEY environment variable or pass apiKey in config.'
      );
    }

    const url = `${this.SECURE_TOKEN_URL}?key=${this.apiKey}`;

    try {
      const { data } = await axios.post(
        url,
        {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Firebase returns snake_case, normalize to common format
      return {
        access_token: data.access_token,
        id_token: data.id_token,
        refresh_token: data.refresh_token,
        expires_in: parseInt(data.expires_in, 10),
        token_type: data.token_type || 'Bearer',
        user_id: data.user_id,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        const firebaseError = error.response.data.error;
        throw new Error(
          `Firebase token refresh failed: ${firebaseError.message || firebaseError.code || 'Unknown error'}`
        );
      }
      throw error;
    }
  }

  /**
   * Verify if a Firebase ID token is valid
   *
   * Verification includes:
   *  - Signature validation using Google's public keys
   *  - Expiration check
   *  - Issuer validation (must be from your Firebase project)
   *  - Audience validation (must match your project ID)
   *
   * @param token - The Firebase ID token to verify
   * @returns true if valid, throws error otherwise
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      await this.verifyJwt(token);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('jwt expired')) {
          throw new Error('Token has expired');
        }
        if (error.message.includes('invalid signature')) {
          throw new Error('Invalid token signature');
        }
        if (error.message.includes('jwt malformed')) {
          throw new Error('Malformed token');
        }
        if (error.message.includes('invalid issuer')) {
          throw new Error('Invalid token issuer - token not from expected Firebase project');
        }
        if (error.message.includes('invalid audience')) {
          throw new Error('Invalid token audience - token not intended for this project');
        }
        throw error;
      }
      return false;
    }
  }

  /**
   * Extract user information from a Firebase ID token
   *
   * @param idToken - The Firebase ID token
   * @returns Normalized user object with common fields
   */
  async getUser(idToken: string): Promise<any> {
    const decoded = jwt.decode(idToken) as any;
    if (!decoded) {
      throw new Error('Invalid ID token - unable to decode');
    }

    // Firebase ID token claims
    // Docs: https://firebase.google.com/docs/auth/admin/verify-id-tokens#retrieve_id_tokens_on_clients
    return {
      // Standard claims
      sub: decoded.sub, // Firebase User UID
      email: decoded.email,
      email_verified: decoded.email_verified,

      // Firebase-specific identifiers
      uid: decoded.user_id || decoded.sub,
      firebase_uid: decoded.user_id || decoded.sub,

      // User profile
      name: decoded.name,
      picture: decoded.picture,
      phone_number: decoded.phone_number,

      // Provider info
      sign_in_provider: decoded.firebase?.sign_in_provider,
      identities: decoded.firebase?.identities,

      // Token metadata
      auth_time: decoded.auth_time,
      iat: decoded.iat,
      exp: decoded.exp,

      // Full token for access to any custom claims
      attributes: decoded,
    };
  }

  /**
   * Fetch Google's public keys for Firebase token verification
   * Keys are cached based on Cache-Control headers
   */
  private async fetchJWKS(): Promise<any[]> {
    const now = Date.now();

    // Return cached keys if still valid
    if (this.jwksCache && now < this.jwksCacheExpiry) {
      return this.jwksCache;
    }

    try {
      const response = await axios.get(this.GOOGLE_JWKS_URL);
      this.jwksCache = response.data.keys;

      // Parse Cache-Control header to determine cache duration
      const cacheControl = response.headers['cache-control'];
      if (cacheControl) {
        const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
        if (maxAgeMatch) {
          const maxAge = parseInt(maxAgeMatch[1], 10) * 1000;
          this.jwksCacheExpiry = now + maxAge;
        } else {
          // Default to 1 hour if no max-age
          this.jwksCacheExpiry = now + 3600 * 1000;
        }
      } else {
        // Default to 1 hour
        this.jwksCacheExpiry = now + 3600 * 1000;
      }

      return this.jwksCache!;
    } catch (error) {
      // If we have cached keys, use them even if expired
      if (this.jwksCache) {
        console.warn('[Firebase Auth] Failed to refresh JWKS, using cached keys');
        return this.jwksCache;
      }
      throw new Error('Failed to fetch Google public keys for Firebase token verification');
    }
  }

  /**
   * Verify JWT token using Google's public keys
   */
  private async verifyJwt(token: string): Promise<any> {
    // Decode token to get key ID from header
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
      throw new Error('Invalid token - unable to decode');
    }

    // Fetch JWKS and find matching key
    const jwks = await this.fetchJWKS();
    const key = jwks.find((k) => k.kid === decoded.header.kid);

    if (!key) {
      // Key not found - might need to refresh cache
      this.jwksCache = null;
      const refreshedJwks = await this.fetchJWKS();
      const refreshedKey = refreshedJwks.find((k) => k.kid === decoded.header.kid);

      if (!refreshedKey) {
        throw new Error(
          'Signing key not found in Google JWKS - token may be invalid or keys rotated'
        );
      }

      const pem = jwkToPem(refreshedKey);
      return this.verifyWithPem(token, pem);
    }

    const pem = jwkToPem(key);
    return this.verifyWithPem(token, pem);
  }

  /**
   * Verify token with PEM key and validate claims
   */
  private verifyWithPem(token: string, pem: string): any {
    return jwt.verify(token, pem, {
      algorithms: ['RS256'],
      issuer: `https://securetoken.google.com/${this.projectId}`,
      audience: this.projectId,
    });
  }
}
