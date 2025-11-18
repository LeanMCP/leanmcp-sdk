import 'dotenv/config';
import { createHTTPServer, MCPServer } from "@leanmcp/core";

/**
 * Slack MCP Server with Authentication
 * 
 * Zero-config setup - services are automatically discovered from ./mcp directory
 * and handle their own dependencies internally.
 */

const serverFactory = async () => {
  const server = new MCPServer({
    name: 'slack-with-auth',
    version: '1.0.0',
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

console.log('\nSlack MCP Server with Authentication');
console.log(`HTTP endpoint: http://localhost:${process.env.PORT || '3000'}/mcp`);
console.log(`Health check: http://localhost:${process.env.PORT || '3000'}/health`);
