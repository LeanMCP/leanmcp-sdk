import 'dotenv/config';
import { createHTTPServer, MCPServer } from "@leanmcp/core";
import { AuthProvider } from "@leanmcp/auth";
import { SlackService, PublicSlackService } from "./mcp/slack/index.js";
import { AuthService } from "./mcp/auth/index.js";

/**
 * Slack MCP Server with Authentication
 * 
 * This example demonstrates a complete Slack integration with Cognito authentication.
 */

// Validate required configuration
if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID) {
  throw new Error(
    'Missing required AWS Cognito configuration. Please set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID in .env file'
  );
}

// Initialize authentication provider
const authProvider = new AuthProvider('cognito', {
  region: process.env.AWS_REGION || 'us-east-1',
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  clientSecret: process.env.COGNITO_CLIENT_SECRET
});

await authProvider.init();

const serverFactory = () => {
  const server = new MCPServer({
    name: 'slack-with-auth',
    version: '1.0.0',
    logging: true
  });

  // Register services
  server.registerService(new SlackService(
    process.env.SLACK_BOT_TOKEN || 'simulated-token',
  ));
  server.registerService(new PublicSlackService());
  server.registerService(new AuthService(authProvider));

  return server.getServer();
};

createHTTPServer(serverFactory, {
  port: parseInt(process.env.PORT || '3000'),
  cors: true
});

console.log('Slack MCP Server with Authentication');
console.log(`HTTP endpoint: http://localhost:${process.env.PORT || '3000'}/mcp`);
console.log(`Health check: http://localhost:${process.env.PORT || '3000'}/health`);
