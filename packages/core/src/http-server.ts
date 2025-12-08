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
  
  if (typeof serverInput === 'function') {
    // Legacy factory pattern
    serverFactory = serverInput;
    httpOptions = options || {};
  } else {
    // New simplified API - serverInput is MCPServerConstructorOptions
    const serverOptions = serverInput;
    
    // Dynamically import MCPServer to avoid circular dependency
    const { MCPServer } = await import('./index.js');
    
    // Create factory that instantiates MCPServer
    serverFactory = async () => {
      const mcpServer = new MCPServer(serverOptions);
      return mcpServer.getServer();
    };
    
    // Extract HTTP options from server options
    httpOptions = {
      port: (serverOptions as any).port,
      cors: (serverOptions as any).cors,
      logging: serverOptions.logging,
      sessionTimeout: (serverOptions as any).sessionTimeout
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
      origin: httpOptions.cors.origin || false, // No wildcard - must be explicitly configured
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'mcp-session-id', 'mcp-protocol-version', 'Authorization'],
      exposedHeaders: ['mcp-session-id'],
      credentials: httpOptions.cors.credentials ?? false, // Default false for security
      maxAge: 86400
    } : false;
    
    if (corsOptions) {
      app.use(cors.default(corsOptions));
    }
  }

  app.use(express.json());

  console.log("Starting LeanMCP HTTP Server...");

  // Health check endpoint
  app.get('/health', (req: any, res: any) => {
    res.json({
      status: 'ok',
      activeSessions: Object.keys(transports).length,
      uptime: process.uptime()
    });
  });

  // MCP endpoint handler
  const handleMCPRequest = async (req: any, res: any) => {
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

  app.post('/mcp', handleMCPRequest);
  app.delete('/mcp', handleMCPRequest);

  return new Promise(async (resolve, reject) => {
    let activeListener: any;

    try {
      // Initialize the MCP server and wait for auto-discovery to complete
      mcpServer = await serverFactory();
      
      // If the server has a waitForInit method (from MCPServer wrapper), wait for it
      if (mcpServer && typeof (mcpServer as any).waitForInit === 'function') {
        await (mcpServer as any).waitForInit();
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

      // Cleanup on shutdown
      const cleanup = () => {
        logger.info('\nShutting down server...');
        
        // Close all MCP transports
        Object.values(transports).forEach(t => t.close?.());
        
        // Close the HTTP server
        activeListener?.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
        
        // Force exit after 5 seconds if graceful shutdown fails
        setTimeout(() => {
          logger.warn('Forcing shutdown...');
          process.exit(1);
        }, 5000);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    } catch (error) {
      reject(error);
    }
  });
}
