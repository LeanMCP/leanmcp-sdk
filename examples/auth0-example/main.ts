import 'dotenv/config';
import { createHTTPServer } from "@leanmcp/core";

/**
 * Auth0 MCP Server Example
 * 
 * Zero-config setup - services are automatically discovered from ./mcp directory
 * and handle their own dependencies internally.
 */

await createHTTPServer({
  name: 'auth0-example',
  version: '1.0.0',
  port: parseInt(process.env.PORT || '3000'),
  cors: true,
  logging: true
});

console.log('\nAuth0 MCP Server Example');
