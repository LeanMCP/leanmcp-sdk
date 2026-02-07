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
`;
