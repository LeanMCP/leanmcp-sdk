import dotenv from "dotenv";
import { createHTTPServer } from "@leanmcp/core";

// Load environment variables
dotenv.config();

// Services are automatically discovered from ./mcp directory
await createHTTPServer({
  name: "test-stateful-mcp",
  version: "1.0.0",
  port: 3001,
  cors: true,
  logging: true,
  stateless: false,
});

console.log("\ntest-stateful-mcp MCP Server");
console.log("Mode: STATEFUL");
console.log("DynamoDB: " + (process.env.LEANMCP_LAMBDA === 'true' ? 'ENABLED' : 'LOCAL'));
