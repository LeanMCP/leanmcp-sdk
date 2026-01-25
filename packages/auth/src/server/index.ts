/**
 * @leanmcp/auth/server - MCP OAuth Server
 *
 * Server-side OAuth components for MCP authorization:
 * - Authorization Server (RFC 8414)
 * - Dynamic Client Registration (RFC 7591)
 * - Token Verification
 *
 * @example
 * ```typescript
 * import { OAuthAuthorizationServer, TokenVerifier } from '@leanmcp/auth/server';
 *
 * // Create authorization server
 * const authServer = new OAuthAuthorizationServer({
 *   issuer: 'https://mcp.example.com',
 *   sessionSecret: process.env.SESSION_SECRET!,
 *   upstreamProvider: {
 *     id: 'github',
 *     authorizationEndpoint: 'https://github.com/login/oauth/authorize',
 *     tokenEndpoint: 'https://github.com/login/oauth/access_token',
 *     clientId: process.env.GITHUB_CLIENT_ID!,
 *     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
 *   },
 * });
 *
 * // Add routes to Express app
 * app.use(authServer.getRouter());
 *
 * // Verify tokens on resource server
 * const verifier = new TokenVerifier({
 *   audience: 'https://mcp.example.com',
 *   issuer: 'https://mcp.example.com',
 *   secret: process.env.TOKEN_SECRET,
 * });
 * ```
 */

// Authorization Server
export { OAuthAuthorizationServer } from './authorization-server';

// Dynamic Client Registration
export { DynamicClientRegistration } from './dcr';

// Token Verification
export { TokenVerifier } from './token-verifier';

// Types
export type {
  // RFC 7591 - DCR
  ClientRegistrationRequest,
  ClientRegistrationResponse,
  RegisteredClient,
  DynamicClientRegistrationOptions,
  // RFC 8414 - AS Metadata
  AuthorizationServerMetadata,
  // RFC 9728 - Protected Resource
  ProtectedResourceMetadata,
  // Token types
  TokenClaims,
  TokenVerificationResult,
  // Options
  OAuthAuthorizationServerOptions,
  TokenVerifierOptions,
} from './types';
