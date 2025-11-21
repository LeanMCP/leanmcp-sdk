import { createHTTPServer } from "@leanmcp/core";

// Services are automatically discovered from ./mcp directory
await createHTTPServer({
  name: "sentiment-analysis-server",
  version: "1.0.0",
  port: 8080,
  cors: true,
  logging: true
});

console.log("\nSentiment Analysis MCP Server");
console.log("HTTP endpoint: http://localhost:8080/mcp");
console.log("Health check: http://localhost:8080/health");
