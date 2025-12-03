import { AuthProvider } from "@leanmcp/auth";

/**
 * Shared configuration for MCP services
 * 
 * This file initializes common dependencies that are shared across multiple services.
 * Services can import what they need from here.
 */

// Initialize authentication provider
// The API key is used by the SDK to authorize verification of user tokens
export const authProvider = new AuthProvider('leanmcp', {
    apiKey: process.env.LEANMCP_API_KEY,
    orchestrationApiUrl: 'http://localhost:3001',
    authUrl: 'http://localhost:3003'
});

// Initialize the provider
await authProvider.init();
