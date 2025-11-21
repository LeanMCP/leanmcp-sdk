import { AuthProvider } from "@leanmcp/auth";

/**
 * Shared configuration for MCP services
 * 
 * This file initializes common dependencies that are shared across multiple services.
 * Services can import what they need from here.
 */

// Validate required configuration
if (!process.env.CLERK_FRONTEND_API || !process.env.CLERK_SECRET_KEY) {
  throw new Error(
    'Missing required Clerk configuration. Please set CLERK_FRONTEND_API and CLERK_SECRET_KEY in .env file'
  );
}

// Initialize authentication provider
export const authProvider = new AuthProvider('clerk', {
  frontendApi: process.env.CLERK_FRONTEND_API,
  secretKey: process.env.CLERK_SECRET_KEY
});

// Initialize the provider
await authProvider.init();
