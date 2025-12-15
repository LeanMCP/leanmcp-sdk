import 'dotenv/config';
import { createHTTPServer } from "@leanmcp/core";

/**
 * Example: Slack MCP Server with Elicitation
 * Demonstrates structured user input collection using @Elicitation decorator
 * with automatic service discovery
 */

// Services are automatically discovered from ./mcp directory
await createHTTPServer({
  name: "slack-elicitation-server",
  version: "1.0.0",
  port: parseInt(process.env.PORT || '3000'),
  cors: true,
  logging: true
});

console.log('\nSlack MCP Server with Elicitation');
