import "reflect-metadata";

/**
 * @leanmcp/auth - Authentication Module
 * 
 * This module provides a base class for implementing authentication providers for MCP tools.
 * Extend AuthProviderBase to integrate with different auth providers (Clerk, Stripe, Firebase, etc.)
 */

/**
 * Base class for authentication providers
 * Extend this class to implement integrations with different auth providers
 */
export abstract class AuthProviderBase {
  /**
   * Initialize the auth provider with configuration
   */
  abstract init(config?: any): Promise<void>;

  /**
   * Refresh an authentication token
   */
  abstract refreshToken(refreshToken: string, username?: string): Promise<any>;

  /**
   * Verify if a token is valid
   */
  abstract verifyToken(token: string): Promise<boolean>;

  /**
   * Get user information from a token
   */
  abstract getUser(token: string): Promise<any>;
}


/**
 * Unified AuthProvider class that dynamically selects the appropriate auth provider
 * based on the provider parameter
 */
export class AuthProvider extends AuthProviderBase {
  private providerInstance: AuthProviderBase | null = null;
  private providerType: string;
  private config: any;

  constructor(provider: string, config?: any) {
    super();
    this.providerType = provider.toLowerCase();
    this.config = config;
  }

  /**
   * Initialize the selected auth provider
   */
  async init(config?: any): Promise<void> {
    const finalConfig = config || this.config;

    switch (this.providerType) {
      case 'cognito': {
        const { AuthCognito } = await import('./providers/cognito');
        this.providerInstance = new AuthCognito();
        await this.providerInstance.init(finalConfig);
        break;
      }
      
      case 'auth0': {
        const { AuthAuth0 } = await import('./providers/auth0');
        this.providerInstance = new AuthAuth0();
        await this.providerInstance.init(finalConfig);
        break;
      }

      case 'clerk': {
        const { AuthClerk } = await import('./providers/clerk');
        this.providerInstance = new AuthClerk();
        await this.providerInstance.init(finalConfig);
        break;
      }
      
      default:
        throw new Error(`Unsupported auth provider: ${this.providerType}. Supported providers: cognito`);
    }
  }

  /**
   * Refresh an authentication token
   */
  async refreshToken(refreshToken: string, username?: string): Promise<any> {
    if (!this.providerInstance) {
      throw new Error("AuthProvider not initialized. Call init() first.");
    }
    return this.providerInstance.refreshToken(refreshToken, username);
  }

  /**
   * Verify if a token is valid
   */
  async verifyToken(token: string): Promise<boolean> {
    if (!this.providerInstance) {
      throw new Error("AuthProvider not initialized. Call init() first.");
    }
    return this.providerInstance.verifyToken(token);
  }

  /**
   * Get user information from a token
   */
  async getUser(token: string): Promise<any> {
    if (!this.providerInstance) {
      throw new Error("AuthProvider not initialized. Call init() first.");
    }
    return this.providerInstance.getUser(token);
  }

  /**
   * Get the provider type
   */
  getProviderType(): string {
    return this.providerType;
  }
}

// Export decorators
export { Authenticated, AuthenticationError, isAuthenticationRequired, getAuthProvider } from './decorators';