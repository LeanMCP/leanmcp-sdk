import 'dotenv/config';
import { createHTTPServer } from "@leanmcp/core";

/**
 * Leanmcp Auth MCP Server Example
 * 
 * Zero-config setup - services are automatically discovered from ./mcp directory
 * and handle their own dependencies internally.
 */

await createHTTPServer({
    name: 'leanmcp-auth',
    version: '1.0.0',
    port: parseInt(process.env.PORT || '3000'),
    cors: true,
    logging: true
});

console.log('\nLeanmcp Auth MCP Server Example');
