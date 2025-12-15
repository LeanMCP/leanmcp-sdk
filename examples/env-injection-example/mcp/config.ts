import { AuthProvider } from "@leanmcp/auth";

/**
 * Shared configuration for MCP services
 * 
 * Configures the LeanMCP auth provider with projectId for env injection.
 */

// Get project ID from environment
export const projectId = process.env.LEANMCP_PROJECT_ID;

if (!projectId) {
    console.warn('Warning: LEANMCP_PROJECT_ID not set. User secrets will not be fetched.');
}

// Initialize authentication provider with projectId
// The projectId is used to scope user secrets to this specific project
export const authProvider = new AuthProvider('leanmcp', {
    apiKey: process.env.LEANMCP_API_KEY,
    orchestrationApiUrl: process.env.LEANMCP_ORCHESTRATION_API_URL || 'https://api.leanmcp.com',
    authUrl: process.env.LEANMCP_AUTH_URL || 'https://auth.leanmcp.com'
});

// Initialize the provider
await authProvider.init();

console.log(`Auth provider initialized with project: ${projectId || '(none)'}`);
