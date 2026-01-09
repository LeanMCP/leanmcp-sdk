import 'dotenv/config';
import { createHTTPServer } from '@leanmcp/core';

// Get public URL from environment (e.g., ngrok URL for ChatGPT)
const publicUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3300}`;

const oauthEnabled = !!(process.env.GITHUB_CLIENT_ID && process.env.SESSION_SECRET);

await createHTTPServer({
  name: 'github-roast',
  version: '1.0.0',
  port: Number(process.env.PORT) || 3300,
  cors: true,
  logging: true,
  stateless: true, // CRITICAL: Enable stateless mode for serverless/Lambda
  // MCP Authorization spec configuration
  auth: {
    resource: publicUrl,
    scopesSupported: ['read:user', 'repo'],
    // Enable OAuth server that proxies to GitHub
    enableOAuthServer: oauthEnabled,
    oauthServerOptions: process.env.SESSION_SECRET ? {
      issuer: publicUrl,
      sessionSecret: process.env.SESSION_SECRET,
      // JWT secrets for stateless operation
      jwtSigningSecret: process.env.JWT_SIGNING_SECRET || process.env.SESSION_SECRET,
      jwtEncryptionSecret: process.env.JWT_ENCRYPTION_SECRET
        ? Buffer.from(process.env.JWT_ENCRYPTION_SECRET, 'hex')
        : Buffer.from(process.env.SESSION_SECRET.padEnd(64, '0').slice(0, 64), 'hex'),
      enableDCR: true, // Enable Dynamic Client Registration for ChatGPT
      tokenTTL: 3600, // 1 hour token lifetime
      upstreamProvider: process.env.GITHUB_CLIENT_ID ? {
        id: 'github',
        authorizationEndpoint: 'https://github.com/login/oauth/authorize',
        tokenEndpoint: 'https://github.com/login/oauth/access_token',
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        scopes: ['read:user', 'repo'],
        userInfoEndpoint: 'https://api.github.com/user',
      } : undefined,
    } : undefined,
  },
});

console.log(`
GitHub Roast - MCP Server Running
----------------------------------
MCP Endpoint:  http://localhost:${process.env.PORT || 3300}/mcp
Dashboard:     http://localhost:${process.env.PORT || 3300}
Public URL:    ${publicUrl}

OAuth Endpoints (if enabled):
  - /.well-known/oauth-protected-resource
  - /.well-known/oauth-authorization-server
  - /oauth/register
  - /oauth/authorize
  - /oauth/token

Tools:
  - openRoastDashboard   Open the roast dashboard
  - fetchGitHubProfile   Fetch GitHub profile data
  - analyzeProfile       Analyze profile stats
  - generateRoast        Generate AI roast
`);

