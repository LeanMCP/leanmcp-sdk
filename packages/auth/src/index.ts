import "reflect-metadata";

/**
 * @leanmcp/auth - Authentication Module
 * 
 * This module provides authentication providers for MCP tools.
 * Currently supports: Clerk, Stripe, and custom providers.
 * 
 * Status: Planned - Coming soon!
 */

export interface AuthProvider {
  name: string;
  verify(token: string): Promise<boolean>;
  getUserInfo(token: string): Promise<any>;
}

export class ClerkAuthProvider implements AuthProvider {
  name = "clerk";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async verify(token: string): Promise<boolean> {
    // TODO: Implement Clerk verification
    console.warn("WARNING: Clerk auth not yet implemented");
    return true;
  }

  async getUserInfo(token: string): Promise<any> {
    // TODO: Implement Clerk user info retrieval
    return { userId: "placeholder" };
  }
}

export class StripeAuthProvider implements AuthProvider {
  name = "stripe";
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  async verify(token: string): Promise<boolean> {
    // TODO: Implement Stripe verification
    console.warn("WARNING: Stripe auth not yet implemented");
    return true;
  }

  async getUserInfo(token: string): Promise<any> {
    // TODO: Implement Stripe customer info retrieval
    return { customerId: "placeholder" };
  }
}

export class CustomAuthProvider implements AuthProvider {
  name = "custom";
  private verifyFn: (token: string) => Promise<boolean>;

  constructor(verifyFn: (token: string) => Promise<boolean>) {
    this.verifyFn = verifyFn;
  }

  async verify(token: string): Promise<boolean> {
    return this.verifyFn(token);
  }

  async getUserInfo(token: string): Promise<any> {
    return { verified: await this.verify(token) };
  }
}

// Registry for auth providers
export class AuthProviderRegistry {
  private static providers = new Map<string, AuthProvider>();

  static register(provider: AuthProvider) {
    this.providers.set(provider.name, provider);
  }

  static get(name: string): AuthProvider | undefined {
    return this.providers.get(name);
  }

  static has(name: string): boolean {
    return this.providers.has(name);
  }
}

// Export convenience functions
export function registerClerkAuth(apiKey: string) {
  AuthProviderRegistry.register(new ClerkAuthProvider(apiKey));
}

export function registerStripeAuth(secretKey: string) {
  AuthProviderRegistry.register(new StripeAuthProvider(secretKey));
}

export function registerCustomAuth(name: string, verifyFn: (token: string) => Promise<boolean>) {
  const provider = new CustomAuthProvider(verifyFn);
  (provider as any).name = name;
  AuthProviderRegistry.register(provider);
}
