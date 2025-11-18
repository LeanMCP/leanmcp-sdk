import { createHTTPServer, MCPServer } from "@leanmcp/core";

const serverFactory = async () => {
  // Services are automatically discovered from ./mcp directory
  const server = new MCPServer({
    name: "sentiment-analysis-server",
    version: "1.0.0",
    logging: true
  });

  return server.getServer();
};

await createHTTPServer(serverFactory, {
  port: 8080,
  cors: true,
  // logging: true // use to log HTTP requests
});

console.log("\nSentiment Analysis MCP Server");
console.log("HTTP endpoint: http://localhost:8080/mcp");
console.log("Health check: http://localhost:8080/health");
