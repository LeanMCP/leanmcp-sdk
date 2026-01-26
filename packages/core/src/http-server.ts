import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { randomUUID } from 'node:crypto';
import { Logger, LogLevel } from './logger';
import { validatePort } from './validation';
import type { MCPServerConstructorOptions } from './index';
import type { ISessionStore } from './session-store';

export interface HTTPServerOptions {
  port?: number;
  cors?:
    | boolean
    | {
        origin?: string | string[];
        credentials?: boolean;
      };
  logging?: boolean;
  logger?: Logger;
  sessionTimeout?: number;
  stateless?: boolean; // Enable stateless mode for Lambda/serverless (default: true)
  dashboard?: boolean; // Serve dashboard UI at / and /mcp GET endpoints (default: true)
  /** OAuth/Auth configuration (MCP authorization spec) */
  auth?: HTTPServerAuthOptions;
  /** Session store for stateful mode (enables session persistence across Lambda container recycling) */
  sessionStore?: ISessionStore;
}

/**
 * OAuth/Auth configuration for MCP server
 *
 * Enables MCP authorization spec compliance by exposing
 * `/.well-known/oauth-protected-resource` (RFC 9728)
 */
export interface HTTPServerAuthOptions {
  /** Resource identifier (defaults to server URL) */
  resource?: string;
  /** Authorization servers (defaults to self) */
  authorizationServers?: string[];
  /** Supported OAuth scopes */
  scopesSupported?: string[];
  /** Documentation URL */
  documentationUrl?: string;
  /** Enable built-in OAuth authorization server */
  enableOAuthServer?: boolean;
  /** OAuth server options (when enableOAuthServer is true) */
  oauthServerOptions?: {
    /** Session secret for signing tokens/state */
    sessionSecret: string;
    /** JWT signing secret (defaults to sessionSecret if not provided) */
    jwtSigningSecret?: string;
    /** JWT encryption secret for encrypting upstream tokens */
    jwtEncryptionSecret?: Buffer;
    /** Issuer URL for JWTs */
    issuer?: string;
    /** Access token TTL in seconds (default: 3600) */
    tokenTTL?: number;
    /** Enable Dynamic Client Registration (for ChatGPT etc.) */
    enableDCR?: boolean;
    /** Upstream OAuth provider configuration */
    upstreamProvider?: {
      id: string;
      authorizationEndpoint: string;
      tokenEndpoint: string;
      clientId: string;
      clientSecret: string;
      scopes?: string[];
      userInfoEndpoint?: string;
    };
  };
}

export interface MCPServerFactory {
  (): Server | Promise<Server>;
}

export type HTTPServerInput = MCPServerFactory | MCPServerConstructorOptions;

// Helper to check if request is initialize
function isInitializeRequest(body: any): boolean {
  return body && body.method === 'initialize';
}

/**
 * Get the file path of the caller (the file that invoked createHTTPServer)
 * This is used to resolve the mcp directory for auto-discovery in stateless mode
 */
function getCallerFile(): string | null {
  const originalPrepareStackTrace = Error.prepareStackTrace;
  try {
    const err = new Error();
    Error.prepareStackTrace = (_, stack) => stack;
    const stack = err.stack as any;

    // Find the first stack frame that's not from the @leanmcp/core package
    for (let i = 0; i < stack.length; i++) {
      let fileName = stack[i].getFileName();
      if (!fileName) continue;

      // Convert file:// URL to regular path first
      if (fileName.startsWith('file://')) {
        try {
          const url = new URL(fileName);
          fileName = decodeURIComponent(url.pathname);
          // On Windows, remove leading slash (e.g., /C:/path -> C:/path)
          if (process.platform === 'win32' && fileName.startsWith('/')) {
            fileName = fileName.substring(1);
          }
        } catch (e) {
          fileName = fileName.replace('file://', '');
          if (process.platform === 'win32' && fileName.startsWith('/')) {
            fileName = fileName.substring(1);
          }
        }
      }

      // Normalize path separators to forward slashes for OS-agnostic comparison
      const normalizedPath = fileName.replace(/\\/g, '/');

      // Check if this file is NOT from the @leanmcp/core package
      const isLeanMCPCore =
        normalizedPath.includes('@leanmcp/core') ||
        normalizedPath.includes('leanmcp-sdk/packages/core');

      // Check if this is a valid TypeScript/JavaScript file
      const isValidExtension =
        fileName.endsWith('.ts') || fileName.endsWith('.js') || fileName.endsWith('.mjs');

      if (!isLeanMCPCore && isValidExtension) {
        return fileName;
      }
    }

    return null;
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
}

/**
 * Create an HTTP server for MCP with Streamable HTTP transport
 * Returns the HTTP server instance to keep the process alive
 *
 * @param serverInput - Either MCPServerConstructorOptions or a factory function that returns a Server
 * @param options - HTTP server options (only used when serverInput is a factory function)
 */
export async function createHTTPServer(
  serverInput: HTTPServerInput,
  options?: HTTPServerOptions
): Promise<any> {
  // Determine if we're using the new simplified API or legacy factory pattern
  let serverFactory: MCPServerFactory;
  let httpOptions: HTTPServerOptions;
  let resolvedMcpDir: string | undefined; // Capture mcpDir at startup for stateless mode

  if (typeof serverInput === 'function') {
    // Legacy factory pattern
    serverFactory = serverInput;
    httpOptions = options || {};
  } else {
    // New simplified API - serverInput is MCPServerConstructorOptions
    const serverOptions = serverInput;

    // Dynamically import MCPServer to avoid circular dependency
    const { MCPServer } = await import('./index.js');

    // IMPORTANT: Resolve the mcpDir NOW, while user code is still on the call stack
    // This is needed because in stateless mode, fresh servers are created during request
    // handling when only @leanmcp/core files are on the stack, causing getCallerFile() to fail
    if (!serverOptions.mcpDir) {
      // Resolve the caller file path while user code is still on the stack
      const callerFile = getCallerFile();
      if (callerFile) {
        // Import path dynamically for directory resolution
        const path = await import('path');
        const callerDir = path.dirname(callerFile);
        resolvedMcpDir = path.join(callerDir, 'mcp');
      }
    } else {
      resolvedMcpDir = serverOptions.mcpDir;
    }

    // Create factory that instantiates MCPServer with explicit mcpDir
    serverFactory = async () => {
      const mcpServer = new MCPServer({
        ...serverOptions,
        mcpDir: resolvedMcpDir || serverOptions.mcpDir,
      });
      return mcpServer.getServer();
    };

    // Extract HTTP options from server options
    httpOptions = {
      port: (serverOptions as any).port,
      cors: (serverOptions as any).cors,
      logging: serverOptions.logging,
      sessionTimeout: (serverOptions as any).sessionTimeout,
      stateless: (serverOptions as any).stateless,
      dashboard: (serverOptions as any).dashboard,
      auth: (serverOptions as any).auth, // MCP auth options
    };
  }
  // Dynamic imports for optional peer dependencies
  // @ts-ignore - Express is a peer dependency
  const [express, { StreamableHTTPServerTransport }, cors] = await Promise.all([
    // @ts-ignore
    import('express').catch(() => {
      throw new Error('Express not found. Install with: npm install express @types/express');
    }),
    // @ts-ignore
    import('@modelcontextprotocol/sdk/server/streamableHttp.js').catch(() => {
      throw new Error('MCP SDK not found. Install with: npm install @modelcontextprotocol/sdk');
    }),
    // @ts-ignore
    httpOptions.cors ? import('cors').catch(() => null) : Promise.resolve(null),
  ]);

  const app = express.default();
  const basePort = httpOptions.port || 3001;

  // Validate base port number
  validatePort(basePort);

  const transports: Record<string, any> = {};
  let mcpServer: Server | null = null; // Store the MCP server instance
  let statelessServerFactory: MCPServerFactory | null = null; // Factory with pre-resolved mcpDir for stateless mode

  // Initialize logger
  const logger =
    httpOptions.logger ||
    new Logger({
      level: httpOptions.logging ? LogLevel.INFO : LogLevel.NONE,
      prefix: 'HTTP',
    });

  // Primary logs must always emit regardless of logging flag
  const logPrimary = (message: string) => {
    if (httpOptions.logging) {
      logger.info?.(message);
    } else {
      console.log(message);
    }
  };

  const warnPrimary = (message: string) => {
    if (httpOptions.logging) {
      logger.warn?.(message);
    } else {
      console.warn(message);
    }
  };

  const startServerWithPortRetry = async () => {
    const maxAttempts = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const portToTry = basePort + attempt;
      const listener = await new Promise<any>((resolve, reject) => {
        const server = app.listen(portToTry);

        const onListening = () => {
          server.off('error', onError);
          resolve(server);
        };

        const onError = (error: NodeJS.ErrnoException) => {
          server.off('listening', onListening);
          server.close();
          reject(error);
        };

        server.once('listening', onListening);
        server.once('error', onError);
      }).catch((error: NodeJS.ErrnoException) => {
        if (error?.code === 'EADDRINUSE' && attempt < maxAttempts - 1) {
          warnPrimary(`Port ${portToTry} in use, trying ${portToTry + 1}...`);
          return null;
        }
        throw error;
      });

      if (listener) {
        return { listener, port: portToTry };
      }
    }

    throw new Error(`No available port found in range ${basePort}-${basePort + maxAttempts - 1}`);
  };

  // Middleware
  if (cors && httpOptions.cors) {
    const corsOptions =
      typeof httpOptions.cors === 'object'
        ? {
            origin: httpOptions.cors.origin || '*', // Use wildcard if not specified
            methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
            allowedHeaders: [
              'Content-Type',
              'mcp-session-id',
              'mcp-protocol-version',
              'Authorization',
            ],
            exposedHeaders: ['mcp-session-id'],
            credentials: httpOptions.cors.credentials ?? false, // Default false for security
            maxAge: 86400,
          }
        : {
            // When cors: true, use permissive defaults for development
            origin: '*',
            methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
            allowedHeaders: [
              'Content-Type',
              'mcp-session-id',
              'mcp-protocol-version',
              'Authorization',
            ],
            exposedHeaders: ['mcp-session-id'],
            credentials: false,
            maxAge: 86400,
          };

    app.use(cors.default(corsOptions));
  }

  app.use(express.json());

  const isStateless = httpOptions.stateless !== false; // Default: true (stateless)

  console.log(`Starting LeanMCP HTTP Server (${isStateless ? 'STATELESS' : 'STATEFUL'})...`);

  // Auto-detect LeanMCP Lambda environment and configure session store
  if (!isStateless && !httpOptions.sessionStore) {
    if (process.env.LEANMCP_LAMBDA === 'true') {
      try {
        const { DynamoDBSessionStore } = await import('./dynamodb-session-store.js');
        httpOptions.sessionStore = new DynamoDBSessionStore({
          logging: httpOptions.logging,
        });
        logger.info('Auto-configured DynamoDB session store for LeanMCP Lambda');
      } catch (e: any) {
        logger.warn(
          `Running on LeanMCP Lambda but failed to initialize DynamoDB session store: ${e.message}`
        );
      }
    }
  }

  // Dashboard configuration
  const DASHBOARD_URL =
    process.env.DASHBOARD_URL ||
    'https://s3-dashboard-build.s3.us-west-2.amazonaws.com/out/index.html';
  let cachedDashboard: string | null = null;
  let cacheTimestamp: number = 0;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Helper function to fetch dashboard from S3
  async function fetchDashboard(): Promise<string> {
    const now = Date.now();

    // Return cached version if still valid
    if (cachedDashboard && now - cacheTimestamp < CACHE_DURATION) {
      return cachedDashboard;
    }

    try {
      const response = await fetch(DASHBOARD_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard: ${response.status}`);
      }

      const html = await response.text();

      // Update cache
      cachedDashboard = html;
      cacheTimestamp = now;

      return html;
    } catch (error) {
      logger.error('Error fetching dashboard from S3:', error);
      throw error;
    }
  }

  // Dashboard endpoints - serve MCP UI at / and /mcp GET (if enabled)
  const isDashboardEnabled = httpOptions.dashboard !== false; // Default: true

  if (isDashboardEnabled) {
    app.get('/', async (req: any, res: any) => {
      try {
        const html = await fetchDashboard();
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        res
          .status(500)
          .send('<h1>Dashboard temporarily unavailable</h1><p>Please try again later.</p>');
      }
    });
  }

  // Health check endpoint
  app.get('/health', (req: any, res: any) => {
    res.json({
      status: 'ok',
      mode: isStateless ? 'stateless' : 'stateful',
      activeSessions: isStateless ? 0 : Object.keys(transports).length,
      uptime: process.uptime(),
    });
  });

  // RFC 9728: Protected Resource Metadata
  // ChatGPT and MCP clients use this to discover auth requirements
  app.get('/.well-known/oauth-protected-resource', (req: any, res: any) => {
    const host = req.headers.host || 'localhost';
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const resource = httpOptions.auth?.resource || `${protocol}://${host}`;
    const authServers = httpOptions.auth?.authorizationServers || [resource];

    res.json({
      resource,
      authorization_servers: authServers,
      scopes_supported: httpOptions.auth?.scopesSupported || [],
      resource_documentation: httpOptions.auth?.documentationUrl,
    });
  });

  // RFC 8414: Authorization Server Metadata (if OAuth server enabled)
  if (httpOptions.auth?.enableOAuthServer && httpOptions.auth?.oauthServerOptions) {
    const authOpts = httpOptions.auth.oauthServerOptions;

    app.get('/.well-known/oauth-authorization-server', (req: any, res: any) => {
      const host = req.headers.host || 'localhost';
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const issuer = httpOptions.auth?.resource || `${protocol}://${host}`;

      res.json({
        issuer,
        authorization_endpoint: `${issuer}/oauth/authorize`,
        token_endpoint: `${issuer}/oauth/token`,
        registration_endpoint: `${issuer}/oauth/register`,
        scopes_supported: httpOptions.auth?.scopesSupported || [],
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: [
          'client_secret_post',
          'client_secret_basic',
          'none',
        ],
      });
    });

    // Try to mount OAuth routes from @leanmcp/auth/server if available
    (async () => {
      try {
        // Dynamic require to avoid TypeScript module resolution issues
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const authServerModule = await import(
          /* webpackIgnore: true */ '@leanmcp/auth/server' as string
        );
        const { OAuthAuthorizationServer } = authServerModule;
        const authServer = new OAuthAuthorizationServer({
          issuer: httpOptions.auth?.resource || `http://localhost:${basePort}`,
          sessionSecret: authOpts.sessionSecret,
          jwtSigningSecret: authOpts.jwtSigningSecret,
          jwtEncryptionSecret: authOpts.jwtEncryptionSecret,
          tokenTTL: authOpts.tokenTTL,
          upstreamProvider: authOpts.upstreamProvider,
          scopesSupported: httpOptions.auth?.scopesSupported,
          enableDCR: true,
        });
        app.use(authServer.getRouter());
        logger.info('OAuth authorization server mounted');
      } catch (e) {
        // @leanmcp/auth/server not available, skip
        logger.warn('OAuth server requested but @leanmcp/auth/server not available');
      }
    })();
  }

  // MCP endpoint handler - STATEFUL mode
  const handleMCPRequestStateful = async (req: any, res: any) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: any;

    // Log incoming request with tool/resource/prompt name if available
    const method = req.body?.method || 'unknown';
    const params = req.body?.params;
    let logMessage = `${req.method} /mcp - ${method}`;

    // Add name for tools/resources/prompts
    if (params?.name) {
      logMessage += ` [${params.name}]`;
    } else if (params?.uri) {
      logMessage += ` [${params.uri}]`;
    }

    // Add session info
    if (sessionId) {
      logMessage += ` (session: ${sessionId.substring(0, 8)}...)`;
    }

    logger.info(logMessage);
    // DEBUG: Log full request details
    logger.info(logMessage);

    // Inject Authorization header into _meta if present (for GPT Apps)
    if (req.headers.authorization) {
      if (!req.body.params) req.body.params = {};
      if (!req.body.params._meta) req.body.params._meta = {};
      // Strip 'Bearer ' prefix if present, or pass full header?
      // GitHubService.getAccessToken expects the token string.
      // The user snippet does: const token = authHeader.split(' ')[1];
      // So we should probably pass the full header or just the token.
      // Existing code expects meta.authToken to be the token.
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        req.body.params._meta.authToken = authHeader.substring(7);
      } else {
        req.body.params._meta.authToken = authHeader;
      }
    }

    try {
      if (sessionId && transports[sessionId]) {
        // Transport exists in memory - reuse it
        transport = transports[sessionId];
        logger.debug(`Reusing session: ${sessionId}`);
      } else if (sessionId && isInitializeRequest(req.body)) {
        // Session ID provided with initialize request (session restoration after container recycle)
        logger.info(
          `Initialize request with session ${sessionId} - checking for session restoration...`
        );

        if (httpOptions.sessionStore) {
          const exists = await httpOptions.sessionStore.sessionExists(sessionId);
          if (exists) {
            // Session exists in DynamoDB - recreate transport with same session ID
            logger.info(`Restoring session: ${sessionId}`);

            transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => sessionId, // Reuse existing session ID
              onsessioninitialized: (sid: string) => {
                logger.info(`Session restored (onsessioninitialized): ${sid}`);
              },
            });

            // Store transport immediately for consistency
            transports[sessionId] = transport;
            logger.info(`Transport stored for restored session: ${sessionId}`);

            transport.onclose = async () => {
              if (transport.sessionId) {
                delete transports[transport.sessionId];
                logger.debug(`Session cleaned up: ${transport.sessionId}`);

                // Remove from session store
                if (httpOptions.sessionStore) {
                  await httpOptions.sessionStore.deleteSession(transport.sessionId);
                }
              }
            };

            // Create fresh MCP server instance (Lambda container recycled)
            const freshServer = await serverFactory();
            if (freshServer && typeof (freshServer as any).waitForInit === 'function') {
              await (freshServer as any).waitForInit();
            }
            await (freshServer as Server).connect(transport);
          } else {
            // Session doesn't exist - fall through to create new session
            logger.info(`Session ${sessionId} not found in store, creating new session`);
          }
        }

        // If no session store or session doesn't exist, create new session (fall through)
        if (!transport) {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: async (newSessionId: string) => {
              transports[newSessionId] = transport;
              logger.info(`Session initialized: ${newSessionId}`);

              // Persist session to store
              if (httpOptions.sessionStore) {
                await httpOptions.sessionStore.createSession(newSessionId);
              }
            },
          });

          transport.onclose = async () => {
            if (transport.sessionId) {
              delete transports[transport.sessionId];
              logger.debug(`Session cleaned up: ${transport.sessionId}`);

              // Remove from session store
              if (httpOptions.sessionStore) {
                await httpOptions.sessionStore.deleteSession(transport.sessionId);
              }
            }
          };

          // Use the pre-initialized server instance
          if (!mcpServer) {
            throw new Error('MCP server not initialized');
          }
          await (mcpServer as Server).connect(transport);
        }
      } else if (sessionId && !isInitializeRequest(req.body)) {
        // Session ID provided but transport missing and NOT an initialize request
        logger.info(`Transport missing for session ${sessionId}, checking session store...`);

        if (httpOptions.sessionStore) {
          // Check if session exists in persistent store
          const exists = await httpOptions.sessionStore.sessionExists(sessionId);
          if (!exists) {
            res.status(404).json({
              jsonrpc: '2.0',
              error: { code: -32001, message: 'Session not found' },
              id: req.body?.id || null,
            });
            return;
          }

          // Session exists in DynamoDB but transport is missing (Lambda container recycled)
          // Auto-restore the session by recreating transport and server
          logger.info(`Auto-restoring session: ${sessionId}`);

          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => sessionId, // Reuse existing session ID
            onsessioninitialized: (sid: string) => {
              logger.info(`Session auto-restored (onsessioninitialized): ${sid}`);
            },
          });

          // Store transport immediately - onsessioninitialized won't fire for non-init requests
          transports[sessionId] = transport;

          // CRITICAL: Manually set the transport's internal _initialized flag
          // The MCP SDK's transport checks this flag and rejects non-init requests if false
          // Since we're restoring a session that was already initialized, we need to bypass this check
          const webTransport = (transport as any)._webStandardTransport;
          if (webTransport) {
            webTransport._initialized = true;
            webTransport.sessionId = sessionId;
            logger.info(`Transport initialized flag set for session: ${sessionId}`);
          }

          transport.onclose = async () => {
            if (transport.sessionId) {
              delete transports[transport.sessionId];
              logger.debug(`Session cleaned up: ${transport.sessionId}`);

              // Remove from session store
              if (httpOptions.sessionStore) {
                await httpOptions.sessionStore.deleteSession(transport.sessionId);
              }
            }
          };

          // Create fresh MCP server instance (Lambda container recycled)
          const freshServer = await serverFactory();
          if (freshServer && typeof (freshServer as any).waitForInit === 'function') {
            await (freshServer as any).waitForInit();
          }
          await (freshServer as Server).connect(transport);
        } else {
          // No session store configured - cannot recreate
          res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Session expired (no session store configured)' },
            id: req.body?.id || null,
          });
          return;
        }
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New session - create transport
        logger.info('Creating new MCP session...');

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: async (newSessionId: string) => {
            transports[newSessionId] = transport;
            logger.info(`Session initialized: ${newSessionId}`);

            // Persist session to store
            if (httpOptions.sessionStore) {
              await httpOptions.sessionStore.createSession(newSessionId);
            }
          },
        });

        transport.onclose = async () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
            logger.debug(`Session cleaned up: ${transport.sessionId}`);

            // Remove from session store
            if (httpOptions.sessionStore) {
              await httpOptions.sessionStore.deleteSession(transport.sessionId);
            }
          }
        };

        // Use the pre-initialized server instance
        if (!mcpServer) {
          throw new Error('MCP server not initialized');
        }
        await (mcpServer as Server).connect(transport);
      } else {
        // Invalid request
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: Invalid session or not an init request' },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error: any) {
      logger.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  };

  // MCP endpoint handler - STATELESS mode (Lambda/serverless compatible)
  const handleMCPRequestStateless = async (req: any, res: any) => {
    // Log incoming request
    const method = req.body?.method || 'unknown';
    const params = req.body?.params;
    let logMessage = `${req.method} /mcp - ${method}`;
    if (params?.name) logMessage += ` [${params.name}]`;
    else if (params?.uri) logMessage += ` [${params.uri}]`;
    logger.info(logMessage);
    // DEBUG: Log full request details
    logger.info(logMessage);

    try {
      // Inject Authorization header into _meta if present (for GPT Apps)
      if (req.headers.authorization) {
        if (!req.body.params) req.body.params = {};
        if (!req.body.params._meta) req.body.params._meta = {};
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          req.body.params._meta.authToken = authHeader.substring(7);
        } else {
          req.body.params._meta.authToken = authHeader;
        }
      }

      // Create fresh server instance for each request
      // Use statelessServerFactory which has the pre-resolved mcpDir
      const freshServer = await statelessServerFactory!();
      if (freshServer && typeof (freshServer as any).waitForInit === 'function') {
        await (freshServer as any).waitForInit();
      }

      // Create transport with no session ID (stateless)
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // No session IDs in stateless mode
      });

      await (freshServer as Server).connect(transport);
      await transport.handleRequest(req, res, req.body);

      // Cleanup after response completes
      // CRITICAL: Must call close() on MCPServer wrapper (if available) to clean Maps/watchers
      res.on('close', () => {
        transport.close();

        // Check if this is an MCPServer instance with our close() method
        if ('close' in freshServer && typeof (freshServer as any).close === 'function') {
          (freshServer as any).close();
        } else {
          // Fallback for raw Server instances
          (freshServer as Server).close();
        }
      });
    } catch (error: any) {
      logger.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  };

  // Route handlers based on mode
  // GET /mcp: serves dashboard HTML unless client requests SSE (text/event-stream)
  // StreamableHTTPClientTransport uses GET with Accept: text/event-stream for server-to-client streaming
  app.get('/mcp', async (req: any, res: any) => {
    const acceptHeader = req.headers['accept'] || '';

    // If client requests SSE, handle as MCP streaming request
    if (acceptHeader.includes('text/event-stream')) {
      // SSE requests need session handling - only supported in stateful mode
      if (!isStateless) {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (sessionId && transports[sessionId]) {
          const transport = transports[sessionId];
          logger.info(`GET /mcp SSE request (session: ${sessionId.substring(0, 8)}...)`);
          await transport.handleRequest(req, res);
          return;
        }
      }
      // Stateless mode or no valid session - return 405 Method Not Allowed
      res.status(405).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'SSE streaming not supported in stateless mode or invalid session',
        },
        id: null,
      });
      return;
    }

    // Otherwise serve dashboard HTML (if enabled)
    if (isDashboardEnabled) {
      try {
        const html = await fetchDashboard();
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        res
          .status(500)
          .send('<h1>Dashboard temporarily unavailable</h1><p>Please try again later.</p>');
      }
    } else {
      res.status(404).json({ error: 'Dashboard disabled' });
    }
  });

  if (isStateless) {
    app.post('/mcp', handleMCPRequestStateless);
    app.delete('/mcp', (_req: any, res: any) => {
      res.status(405).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed (stateless mode)' },
        id: null,
      });
    });
  } else {
    app.post('/mcp', handleMCPRequestStateful);
    app.delete('/mcp', handleMCPRequestStateful);
  }

  return new Promise(async (resolve, reject) => {
    let activeListener: any;

    try {
      // Initialize the MCP server and wait for auto-discovery to complete
      mcpServer = await serverFactory();

      // If the server has a waitForInit method (from MCPServer wrapper), wait for it
      if (mcpServer && typeof (mcpServer as any).waitForInit === 'function') {
        await (mcpServer as any).waitForInit();
      }

      // In stateless mode, use the same factory (with pre-resolved mcpDir) for fresh servers
      if (isStateless) {
        statelessServerFactory = serverFactory;
      }

      // Now start the HTTP listener - all services are discovered and ready
      const { listener, port } = await startServerWithPortRetry();
      activeListener = listener;

      // Surface the actual bound port for downstream consumers
      process.env.PORT = String(port);
      (listener as any).port = port;

      // Always emit startup endpoints to console only to avoid double logging
      console.log(`Server running on http://localhost:${port}`);
      console.log(`MCP endpoint: http://localhost:${port}/mcp`);
      console.log(`Health check: http://localhost:${port}/health`);
      resolve({ listener, port }); // Return listener and port to keep process alive

      listener.on('error', (error: NodeJS.ErrnoException) => {
        logger.error(`Server error: ${error.message}`);
        reject(error);
      });

      // Graceful shutdown handler - cross-platform (Windows/Mac/Linux)
      let isShuttingDown = false;
      const cleanup = async () => {
        if (isShuttingDown) return;
        isShuttingDown = true;

        logger.info('\nShutting down server...');

        // Close all MCP transports first
        for (const transport of Object.values(transports)) {
          try {
            transport.close?.();
          } catch (e) {
            // Ignore transport close errors
          }
        }

        // Close the HTTP server and release the port
        if (activeListener) {
          await new Promise<void>((resolveClose) => {
            activeListener!.close((err: Error | undefined) => {
              if (err) {
                logger.warn(`Error closing server: ${err.message}`);
              } else {
                logger.info('Server closed');
              }
              resolveClose();
            });
          });
        }
      };

      // Register signal handlers - use 'once' for all platforms
      const handleShutdown = () => {
        cleanup().finally(() => {
          // Let the calling process (CLI) handle exit
          // This ensures proper cross-platform behavior
        });
      };

      process.once('SIGINT', handleShutdown);
      process.once('SIGTERM', handleShutdown);
    } catch (error) {
      reject(error);
    }
  });
}
