import { AuthProvider } from "@leanmcp/auth";

/**
 * Shared configuration for MCP services
 * 
 * This file initializes common dependencies that are shared across multiple services.
 * Services can import what they need from here.
 */

// Validate required configuration
if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID) {
  throw new Error(
    'Missing required AWS Cognito configuration. Please set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID in .env file'
  );
}

// Initialize authentication provider
export const authProvider = new AuthProvider('cognito', {
  region: process.env.AWS_REGION || 'us-east-1',
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  clientSecret: process.env.COGNITO_CLIENT_SECRET
});

// Initialize the provider
await authProvider.init();
