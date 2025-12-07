import 'dotenv/config';
import { createHTTPServer } from "@leanmcp/core";

/**
 * Slack MCP Server with Authentication
 * 
 * Zero-config setup - services are automatically discovered from ./mcp directory
 * and handle their own dependencies internally.
 */

await createHTTPServer({
  name: 'slack-with-auth',
  version: '1.0.0',
  port: parseInt(process.env.PORT || '3000'),
  cors: true,
  logging: true
});

console.log('\nSlack MCP Server with Authentication');

