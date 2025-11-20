import 'dotenv/config';
import { createHTTPServer, MCPServer } from "@leanmcp/core";

/**
 * Auth0 MCP Server Example
 * 
 * Zero-config setup - services are automatically discovered from ./mcp directory
 * and handle their own dependencies internally.
 */

const serverFactory = async () => {
  const server = new MCPServer({
    name: 'auth0-example',
    version: '1.0.0',
    logging: true
  });

  return server.getServer();
};

await createHTTPServer(serverFactory, {
  port: parseInt(process.env.PORT || '3000'),
  cors: true,
  // logging: true // use to log HTTP requests
});

console.log('\nAuth0 MCP Server Example');
console.log(`HTTP endpoint: http://localhost:${process.env.PORT || '3000'}/mcp`);
console.log(`Health check: http://localhost:${process.env.PORT || '3000'}/health`);
