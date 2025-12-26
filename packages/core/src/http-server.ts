import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { randomUUID } from "node:crypto";
import { Logger, LogLevel } from "./logger";
import { validatePort } from "./validation";
import type { MCPServerConstructorOptions } from "./index";

export interface HTTPServerOptions {
  port?: number;
  cors?: boolean | {
    origin?: string | string[];
    credentials?: boolean;
  };
  logging?: boolean;
  logger?: Logger;
  sessionTimeout?: number;
  stateless?: boolean;  // Enable stateless mode for Lambda/serverless (default: true)
  dashboard?: boolean;  // Serve dashboard UI at / and /mcp GET endpoints (default: true)
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
      const isLeanMCPCore = normalizedPath.includes('@leanmcp/core') ||
        normalizedPath.includes('leanmcp-sdk/packages/core');

      // Check if this is a valid TypeScript/JavaScript file
      const isValidExtension = fileName.endsWith('.ts') ||
        fileName.endsWith('.js') ||
        fileName.endsWith('.mjs');

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
      dashboard: (serverOptions as any).dashboard
    };
  }
  // Dynamic imports for optional peer dependencies
  // @ts-ignore - Express is a peer dependency
  const [express, { StreamableHTTPServerTransport }, cors] = await Promise.all([
    // @ts-ignore
    import("express").catch(() => {
      throw new Error("Express not found. Install with: npm install express @types/express");
    }),
    // @ts-ignore
    import("@modelcontextprotocol/sdk/server/streamableHttp.js").catch(() => {
      throw new Error("MCP SDK not found. Install with: npm install @modelcontextprotocol/sdk");
    }),
    // @ts-ignore
    httpOptions.cors ? import("cors").catch(() => null) : Promise.resolve(null)
  ]);

  const app = express.default();
  const basePort = httpOptions.port || 3001;

  // Validate base port number
  validatePort(basePort);

  const transports: Record<string, any> = {};
  let mcpServer: Server | null = null; // Store the MCP server instance
  let statelessServerFactory: MCPServerFactory | null = null; // Factory with pre-resolved mcpDir for stateless mode

  // Initialize logger
  const logger = httpOptions.logger || new Logger({
    level: httpOptions.logging ? LogLevel.INFO : LogLevel.NONE,
    prefix: 'HTTP'
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
    const corsOptions = typeof httpOptions.cors === 'object' ? {
      origin: httpOptions.cors.origin || '*', // Use wildcard if not specified
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'mcp-session-id', 'mcp-protocol-version', 'Authorization'],
      exposedHeaders: ['mcp-session-id'],
      credentials: httpOptions.cors.credentials ?? false, // Default false for security
      maxAge: 86400
    } : {
      // When cors: true, use permissive defaults for development
      origin: '*',
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'mcp-session-id', 'mcp-protocol-version', 'Authorization'],
      exposedHeaders: ['mcp-session-id'],
      credentials: false,
      maxAge: 86400
    };

    app.use(cors.default(corsOptions));
  }

  app.use(express.json());

  const isStateless = httpOptions.stateless !== false;  // Default: true (stateless)

  console.log(`Starting LeanMCP HTTP Server (${isStateless ? 'STATELESS' : 'STATEFUL'})...`);

  // Dashboard configuration
  const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://s3-dashboard-build.s3.us-west-2.amazonaws.com/out/index.html';
  let cachedDashboard: string | null = null;
  let cacheTimestamp: number = 0;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Helper function to fetch dashboard from S3
  async function fetchDashboard(): Promise<string> {
    const now = Date.now();

    // Return cached version if still valid
    if (cachedDashboard && (now - cacheTimestamp) < CACHE_DURATION) {
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
  const isDashboardEnabled = httpOptions.dashboard !== false;  // Default: true

  if (isDashboardEnabled) {
    app.get('/', async (req: any, res: any) => {
      try {
        const html = await fetchDashboard();
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        res.status(500).send('<h1>Dashboard temporarily unavailable</h1><p>Please try again later.</p>');
      }
    });
  }

  // Health check endpoint
  app.get('/health', (req: any, res: any) => {
    res.json({
      status: 'ok',
      mode: isStateless ? 'stateless' : 'stateful',
      activeSessions: isStateless ? 0 : Object.keys(transports).length,
      uptime: process.uptime()
    });
  });

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

    try {
      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
        logger.debug(`Reusing session: ${sessionId}`);
      } else if (!sessionId && isInitializeRequest(req.body)) {
        logger.info("Creating new MCP session...");

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId: string) => {
            transports[newSessionId] = transport;
            logger.info(`Session initialized: ${newSessionId}`);
          }
        });

        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
            logger.debug(`Session cleaned up: ${transport.sessionId}`);
          }
        };

        // Use the pre-initialized server instance
        if (!mcpServer) {
          throw new Error('MCP server not initialized');
        }
        await (mcpServer as Server).connect(transport);
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: Invalid session or not an init request' },
          id: null
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
          id: null
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

    try {
      // Create fresh server instance for each request
      // Use statelessServerFactory which has the pre-resolved mcpDir
      const freshServer = await statelessServerFactory!();
      if (freshServer && typeof (freshServer as any).waitForInit === 'function') {
        await (freshServer as any).waitForInit();
      }

      // Create transport with no session ID (stateless)
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,  // No session IDs in stateless mode
      });

      await (freshServer as Server).connect(transport);
      await transport.handleRequest(req, res, req.body);

      // Cleanup after response completes
      res.on('close', () => {
        transport.close();
        (freshServer as Server).close();
      });
    } catch (error: any) {
      logger.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null
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
        error: { code: -32000, message: 'SSE streaming not supported in stateless mode or invalid session' },
        id: null
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
        res.status(500).send('<h1>Dashboard temporarily unavailable</h1><p>Please try again later.</p>');
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
        id: null
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
