import 'dotenv/config';
import { createHTTPServer } from "@leanmcp/core";

/**
 * ENV Injection MCP Server Example
 * 
 * Demonstrates user-scoped environment variable injection.
 * Each user gets their own secrets based on their LeanMCP authentication.
 * 
 * Services are auto-discovered from ./mcp directory.
 */

await createHTTPServer({
    name: 'env-injection-example',
    version: '1.0.0',
    port: parseInt(process.env.PORT || '3000'),
    cors: true,
    logging: false
});

console.log('\nENV Injection MCP Server Example');
console.log('  - @RequireEnv decorator for validating required env vars');
console.log('  - getEnv() for accessing user-specific secrets');
console.log('  - Request-scoped isolation (each user sees their own secrets)');
