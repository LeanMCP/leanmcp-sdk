import { AuthProvider } from "@leanmcp/auth";

/**
 * Shared configuration for MCP services
 * 
 * This file initializes common dependencies that are shared across multiple services.
 * Services can import what they need from here.
 */

// Validate required configuration
if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_CLIENT_ID || !process.env.AUTH0_AUDIENCE) {
  throw new Error(
    'Missing required Auth0 configuration. Please set AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_AUDIENCE in .env file'
  );
}

// Initialize authentication provider
export const authProvider = new AuthProvider('auth0', {
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  audience: process.env.AUTH0_AUDIENCE,
  scopes: 'openid profile email offline_access'
});

// Initialize the provider
await authProvider.init();
