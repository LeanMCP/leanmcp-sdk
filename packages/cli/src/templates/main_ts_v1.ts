export const getMainTsTemplate = (
  projectName: string,
  dashboardLine: string
): string => `import dotenv from "dotenv";
import { createHTTPServer } from "@leanmcp/core";

// Load environment variables
dotenv.config();

console.log("Starting ${projectName} MCP Server...");
console.log("Features included:");
console.log("   Schema validation with decorators");
console.log("   Resource endpoints");
console.log("   Prompt templates");
console.log("   Type-safe tool definitions");
console.log("");

// Services are automatically discovered from ./mcp directory
await createHTTPServer({
  name: "${projectName}",
  version: "1.0.0",
  port: 3001,
  cors: true,
  logging: true${dashboardLine}
});

console.log("\\n${projectName} MCP Server is running!");
console.log("\\nTry these commands to test your server:");
console.log("");
console.log("# Test calculation tool (schema validation)");
console.log('curl -X POST http://localhost:3001/mcp \\\\');
console.log('  -H "Content-Type: application/json" \\\\');
console.log('  -d \'{"method": "tools/call", "params": {"name": "calculate", "arguments": {"a": 10, "b": 5, "operation": "add"}}}\'');
console.log("");
console.log("# Test echo tool");
console.log('curl -X POST http://localhost:3001/mcp \\\\');
console.log('  -H "Content-Type: application/json" \\\\');
console.log('  -d \'{"method": "tools/call", "params": {"name": "echo", "arguments": {"message": "Hello LeanMCP!"}}}\'');
console.log("");
console.log("# Get server information (resource)");
console.log('curl -X POST http://localhost:3001/mcp \\\\');
console.log('  -H "Content-Type: application/json" \\\\');
console.log('  -d \'{"method": "resources/read", "params": {"uri": "server://info"}}\'');
console.log("");
console.log("Ready to customize - add your own tools, resources, and prompts!");
`;
