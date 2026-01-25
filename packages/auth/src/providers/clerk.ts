import axios from 'axios';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import { AuthProviderBase } from '../index';

/**
 * Clerk authentication provider implementation
 * Supports:
 *  - SESSION MODE (default)
 *  - OAUTH MODE (refresh tokens enabled)
 */
export class AuthClerk extends AuthProviderBase {
  private clerkFrontendApi = '';
  private clerkSecretKey = '';
  private clerkJWKSUrl = '';
  private clerkIssuer = '';
  private jwksCache: any[] | null = null;

  private mode: 'session' | 'oauth' = 'session';
  private oauthTokenUrl = '';
  private clientId?: string;
  private clientSecret?: string;
  private redirectUri?: string;

  /**
   * Initialize Clerk Auth Provider
   */
  async init(config?: {
    frontendApi?: string;
    secretKey?: string;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
  }) {
    this.clerkFrontendApi = config?.frontendApi || process.env.CLERK_FRONTEND_API || '';
    this.clerkSecretKey = config?.secretKey || process.env.CLERK_SECRET_KEY || '';

    if (!this.clerkFrontendApi || !this.clerkSecretKey) {
      throw new Error('Missing Clerk configuration: frontendApi and secretKey are required');
    }

    this.clerkIssuer = `https://${this.clerkFrontendApi}`;
    this.clerkJWKSUrl = `${this.clerkIssuer}/.well-known/jwks.json`;

    /**
     * Detect OAuth mode (refresh token support)
     */
    if (config?.clientId && config?.clientSecret && config?.redirectUri) {
      this.mode = 'oauth';
      this.clientId = config.clientId;
      this.clientSecret = config.clientSecret;
      this.redirectUri = config.redirectUri;
      this.oauthTokenUrl = `${this.clerkIssuer}/oauth/token`;
    }
  }

  /**
   * Refresh tokens (OAuth mode only)
   */
  async refreshToken(refreshToken: string): Promise<any> {
    if (this.mode !== 'oauth') {
      throw new Error(
        'Clerk is in Session Mode: refresh tokens are not supported. Enable OAuth mode.'
      );
    }

    const payload = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    };

    const { data } = await axios.post(this.oauthTokenUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    return data; // contains access_token, id_token, refresh_token
  }

  /**
   * Verify JWT using JWKS
   */
  async verifyToken(token: string): Promise<boolean> {
    await this.verifyJwt(token);
    return true;
  }

  /**
   * Extract user data from ID token
   */
  async getUser(idToken: string): Promise<any> {
    const decoded = jwt.decode(idToken) as any;
    if (!decoded) throw new Error('Invalid ID token');

    return {
      sub: decoded.sub,
      email: decoded.email,
      email_verified: decoded.email_verified,
      first_name: decoded.given_name,
      last_name: decoded.family_name,
      attributes: decoded,
    };
  }

  /**
   * JWT verification using JWKS
   */
  private async verifyJwt(token: string): Promise<any> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) throw new Error('Invalid token');

    const jwks = await this.fetchJWKS();
    const key = jwks.find((k) => k.kid === decoded.header.kid);
    if (!key) throw new Error('Signing key not found in JWKS');

    const pem = jwkToPem(key);
    return jwt.verify(token, pem, {
      algorithms: ['RS256'],
      issuer: this.clerkIssuer,
    });
  }

  private async fetchJWKS(): Promise<any[]> {
    if (!this.jwksCache) {
      const { data } = await axios.get(this.clerkJWKSUrl);
      this.jwksCache = data.keys;
    }
    return this.jwksCache!;
  }
}
