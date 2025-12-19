import dotenv from 'dotenv';
import { createHTTPServer } from '@leanmcp/core';

// Load environment variables
dotenv.config();

// Services are automatically discovered from ./mcp directory
await createHTTPServer({
  name: 'slack-mcp-server',
  version: '1.0.0',
  port: 3001,
  cors: true,
  logging: true,
});

console.log('\nSlack MCP Server');
console.log('Connect your Slack workspace by setting SLACK_BOT_TOKEN in .env');
