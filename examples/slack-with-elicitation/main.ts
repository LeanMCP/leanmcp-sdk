import 'dotenv/config';
import { createHTTPServer, MCPServer } from "@leanmcp/core";
import { SlackService } from "./mcp/slack/index";

/**
 * Example: Slack MCP Server with Elicitation
 * Demonstrates structured user input collection using @Elicitation decorator
 */

const serverFactory = () => {
  const server = new MCPServer({
    name: "slack-elicitation-server",
    version: "1.0.0",
    logging: true
  });

  // Register Slack service with elicitation examples
  server.registerService(new SlackService());

  return server.getServer();
};

createHTTPServer(serverFactory, {
  port: parseInt(process.env.PORT || '3000'),
  cors: true
});

console.log('Slack MCP Server with Elicitation');
console.log(`HTTP endpoint: http://localhost:${process.env.PORT || '3000'}/mcp`);
console.log(`Health check: http://localhost:${process.env.PORT || '3000'}/health`);
