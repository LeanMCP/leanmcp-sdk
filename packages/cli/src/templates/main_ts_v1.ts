export const getMainTsTemplate = (
  projectName: string,
  dashboardLine: string
): string => `import dotenv from "dotenv";
import { createHTTPServer } from "@leanmcp/core";

// Load environment variables
dotenv.config();

// Services are automatically discovered from ./mcp directory
await createHTTPServer({
  name: "${projectName}",
  version: "1.0.0",
  port: 3001,
  cors: true,
  logging: true${dashboardLine}
});

console.log("\\n${projectName} MCP Server");
`;
