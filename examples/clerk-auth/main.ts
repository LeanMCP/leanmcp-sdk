import 'dotenv/config';
import { createHTTPServer } from "@leanmcp/core";

/**
 * Clerk MCP Server Example
 * 
 * Zero-config setup - services are automatically discovered from ./mcp directory
 * and handle their own dependencies internally.
 */

await createHTTPServer({
  name: 'clerk-auth',
  version: '1.0.0',
  port: parseInt(process.env.PORT || '3000'),
  cors: true,
  logging: true
});

console.log('\nClerk MCP Server Example');
console.log(`HTTP endpoint: http://localhost:${process.env.PORT || '3000'}/mcp`);
console.log(`Health check: http://localhost:${process.env.PORT || '3000'}/health`);
