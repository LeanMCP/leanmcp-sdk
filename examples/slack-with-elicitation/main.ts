import 'dotenv/config';
import { createHTTPServer, MCPServer } from "@leanmcp/core";

/**
 * Example: Slack MCP Server with Elicitation
 * Demonstrates structured user input collection using @Elicitation decorator
 * with automatic service discovery
 */

const serverFactory = async () => {
  // Services are automatically discovered from ./mcp directory
  const server = new MCPServer({
    name: "slack-elicitation-server",
    version: "1.0.0",
    logging: true
  });

  // Initialize and auto-discover services
  await server.init();

  return server.getServer();
};

await createHTTPServer(serverFactory, {
  port: parseInt(process.env.PORT || '3000'),
  cors: true
});

console.log('\nSlack MCP Server with Elicitation');
console.log(`HTTP endpoint: http://localhost:${process.env.PORT || '3000'}/mcp`);
console.log(`Health check: http://localhost:${process.env.PORT || '3000'}/health`);
