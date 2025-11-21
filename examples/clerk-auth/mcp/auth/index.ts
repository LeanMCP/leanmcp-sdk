import { Tool, SchemaConstraint } from "@leanmcp/core";
import { AuthProvider } from "@leanmcp/auth";
import { authProvider } from "../config.js";

/**
 * Input for refreshing authentication token
 */
class RefreshTokenInput {
  @SchemaConstraint({
    description: 'Refresh token to use for obtaining a new access token',
    minLength: 1
  })
  refreshToken!: string;
}

/**
 * Output from token refresh operation
 */
class RefreshTokenOutput {
  @SchemaConstraint({
    description: 'New access token'
  })
  access_token!: string;

  @SchemaConstraint({
    description: 'New ID token'
  })
  id_token!: string;

  @SchemaConstraint({
    description: 'New refresh token (if rotation enabled)'
  })
  refresh_token?: string;
}

/**
 * Authentication Service
 * 
 * Provides authentication-related tools for token management.
 * This service is NOT protected by @Authenticated decorator since it's used
 * to obtain/refresh tokens in the first place.
 */
export class AuthService {
  private authProvider: AuthProvider;

  constructor() {
    // Use the module-level authProvider
    this.authProvider = authProvider;
  }

  /**
   * Refresh an expired access token using a refresh token
   * 
   * This tool allows users to obtain a new access token when their current one expires.
   * No authentication required since this is used to obtain tokens.
   */
  @Tool({ 
    description: 'Refresh an expired access token using a refresh token. Returns a new access token that can be used for authenticated requests.',
    inputClass: RefreshTokenInput
  })
  async refreshToken(args: RefreshTokenInput): Promise<RefreshTokenOutput> {
    try {
      const result = await this.authProvider.refreshToken(args.refreshToken);
      
      return {
        access_token: result.access_token,
        id_token: result.id_token,
        refresh_token: result.refresh_token
      };
    } catch (error) {
      throw new Error(
        `Failed to refresh token: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get information about the authentication provider
   */
  @Tool({ 
    description: 'Get information about the authentication configuration and requirements' 
  })
  async getAuthInfo(): Promise<{
    provider: string;
    authRequired: boolean;
    tokenType: string;
    instructions: string;
  }> {
    return {
      provider: this.authProvider.getProviderType(),
      authRequired: true,
      tokenType: 'Bearer',
      instructions: 'Include your access token in the "token" field of authenticated requests. Use refreshToken tool to obtain a new token when expired.'
    };
  }
}
