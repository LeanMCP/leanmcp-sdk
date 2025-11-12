import { createHTTPServer, MCPServer } from "@leanmcp/core";
import { SentimentAnalysisService } from "./mcp/sentiment/index.js";

const serverFactory = () => {
  const server = new MCPServer({
    name: "sentiment-analysis-server",
    version: "1.0.0",
    logging: true
  });
  server.registerService(new SentimentAnalysisService());
  return server.getServer();
};

createHTTPServer(serverFactory, {
  port: 8080,
  cors: true
});

console.log("Sentiment Analysis MCP Server");
console.log("HTTP endpoint: http://localhost:8080/mcp");
console.log("Health check: http://localhost:8080/health");
