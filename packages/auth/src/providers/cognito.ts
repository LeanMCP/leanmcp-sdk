import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { createHmac } from 'crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import { AuthProviderBase } from '../index';

/**
 * AWS Cognito authentication provider implementation
 */
export class AuthCognito extends AuthProviderBase {
  private cognito: CognitoIdentityProviderClient | null = null;
  private region: string = '';
  private userPoolId: string = '';
  private clientId: string = '';
  private clientSecret: string = '';
  private jwksCache: any[] | null = null;

  /**
   * Initialize the Cognito client with configuration
   */
  async init(config?: {
    region?: string;
    userPoolId?: string;
    clientId?: string;
    clientSecret?: string;
  }): Promise<void> {
    this.region = config?.region || process.env.AWS_REGION || '';
    this.userPoolId = config?.userPoolId || process.env.COGNITO_USER_POOL_ID || '';
    this.clientId = config?.clientId || process.env.COGNITO_CLIENT_ID || '';
    this.clientSecret = config?.clientSecret || process.env.COGNITO_CLIENT_SECRET || '';

    if (!this.region || !this.userPoolId || !this.clientId) {
      throw new Error(
        'Missing required Cognito configuration: region, userPoolId, and clientId are required'
      );
    }

    this.cognito = new CognitoIdentityProviderClient({ region: this.region });
  }

  /**
   * Refresh access tokens using a refresh token
   */
  async refreshToken(refreshToken: string, username: string): Promise<any> {
    if (!this.cognito) {
      throw new Error('CognitoAuth not initialized. Call init() first.');
    }

    const authParameters: Record<string, string> = {
      REFRESH_TOKEN: refreshToken,
    };

    // Calculate and add SECRET_HASH if client secret is configured
    if (this.clientSecret) {
      const usernameForHash = username;
      const secretHash = this.calculateSecretHash(usernameForHash);
      authParameters.SECRET_HASH = secretHash;
    }

    const command = new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: this.clientId,
      AuthParameters: authParameters,
    });

    return await this.cognito.send(command);
  }

  /**
   * Verify a Cognito JWT token using JWKS
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      await this.verifyJwt(token);
      return true;
    } catch (error) {
      // Provide specific error messages for common JWT errors
      if (error instanceof Error) {
        if (error.message.includes('jwt expired')) {
          throw new Error('Token has expired');
        } else if (error.message.includes('invalid signature')) {
          throw new Error('Invalid token signature');
        } else if (error.message.includes('jwt malformed')) {
          throw new Error('Malformed token');
        } else if (error.message.includes('invalid issuer')) {
          throw new Error('Invalid token issuer');
        }
        // Re-throw the original error if it's not a recognized JWT error
        throw error;
      }
      return false;
    }
  }

  /**
   * Get user information from an ID token
   */
  async getUser(idToken: string): Promise<any> {
    // Decode the ID token without signature verification
    const decoded = jwt.decode(idToken) as any;

    if (!decoded) {
      throw new Error('Invalid ID token');
    }

    return {
      username: decoded['cognito:username'],
      email: decoded.email,
      email_verified: decoded.email_verified,
      sub: decoded.sub,
      attributes: decoded,
    };
  }

  /**
   * Fetch JWKS from Cognito (cached)
   */
  private async fetchJWKS(): Promise<any[]> {
    if (!this.jwksCache) {
      const jwksUri = `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}/.well-known/jwks.json`;
      const { data } = await axios.get(jwksUri);
      this.jwksCache = data.keys;
    }
    return this.jwksCache!;
  }

  /**
   * Verify JWT token using JWKS
   */
  private async verifyJwt(token: string): Promise<any> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
      throw new Error('Invalid token');
    }

    const jwks = await this.fetchJWKS();
    const key = jwks.find((k) => k.kid === decoded.header.kid);
    if (!key) {
      throw new Error('Signing key not found in JWKS');
    }

    const pem = jwkToPem(key);

    return jwt.verify(token, pem, {
      algorithms: ['RS256'],
      issuer: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`,
    });
  }

  /**
   * Calculate SECRET_HASH for Cognito authentication
   * SECRET_HASH = Base64(HMAC_SHA256(username + clientId, clientSecret))
   */
  private calculateSecretHash(username: string): string {
    const message = username + this.clientId;
    const hmac = createHmac('sha256', this.clientSecret);
    hmac.update(message);
    return hmac.digest('base64');
  }
}
