import 'dotenv/config';
import { createHTTPServer } from '@leanmcp/core';

// Services are automatically discovered from ./mcp directory
await createHTTPServer({
  name: 'social-monitor',
  version: '1.0.0',
  port: Number(process.env.PORT) || 3200,
  cors: true,
  logging: true,
});

console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Social Monitor - MCP Server Running                ║
╠══════════════════════════════════════════════════════════════╣
║  MCP Endpoint:  http://localhost:${process.env.PORT || 3200}/mcp                    ║
║  Dashboard:     http://localhost:${process.env.PORT || 3200}                        ║
╚══════════════════════════════════════════════════════════════╝

Available Tools:
  • discoverMCPOpportunities  - Find MCP discussions for outreach
  • getMyPostReplies          - Get replies on your posts
  • getLeanMCPMentions        - Find LeanMCP mentions
  • generateResponse          - Generate AI response
`);
