import { createHTTPServer } from "@leanmcp/core";

// Services are automatically discovered from ./mcp directory
await createHTTPServer({
    name: "ecommerce-search-server",
    version: "1.0.0",
    port: 8080,
    cors: true,
    logging: true
});

console.log("\nE-commerce Product Search MCP Server");
console.log("  MCP Endpoint:  http://localhost:8080/mcp");
console.log("  Dashboard:     http://localhost:8080");
console.log("  Health check:  http://localhost:8080/health");
