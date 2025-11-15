import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { randomUUID } from "node:crypto";
import { Logger, LogLevel } from "./logger";

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

// Helper to check if request is initialize
function isInitializeRequest(body: any): boolean {
  return body && body.method === 'initialize';
}

/**
 * Create an HTTP server for MCP with Streamable HTTP transport
 */
export async function createHTTPServer(
  serverFactory: MCPServerFactory,
  options: HTTPServerOptions = {}
): Promise<void> {
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
    options.cors ? import("cors").catch(() => null) : Promise.resolve(null)
  ]);

  const app = express.default();
  const port = options.port || 3001;
  const transports: Record<string, any> = {};
  
  // Initialize logger
  const logger = options.logger || new Logger({
    level: options.logging ? LogLevel.INFO : LogLevel.NONE,
    prefix: 'HTTP'
  });

  // Middleware
  if (cors && options.cors) {
    const corsOptions = typeof options.cors === 'object' ? {
      origin: options.cors.origin || "*",
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'mcp-session-id', 'mcp-protocol-version', 'Authorization'],
      exposedHeaders: ['mcp-session-id'],
      credentials: options.cors.credentials ?? true
    } : {
      origin: "*",
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'mcp-session-id', 'mcp-protocol-version', 'Authorization'],
      exposedHeaders: ['mcp-session-id'],
      credentials: true
    };
    app.use(cors.default(corsOptions));
  }

  app.use(express.json());

  logger.info("Starting LeanMCP HTTP Server...");

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

        const server = await serverFactory();
        await server.connect(transport);
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

  // Cleanup on shutdown
  process.on('SIGINT', () => {
    logger.info('\nShutting down server...');
    Object.values(transports).forEach(t => t.close?.());
    process.exit(0);
  });

  return new Promise((resolve) => {
    app.listen(port, () => {
      logger.info(`Server running on http://localhost:${port}`);
      logger.info(`MCP endpoint: http://localhost:${port}/mcp`);
      logger.info(`Health check: http://localhost:${port}/health`);
      resolve();
    });
  });
}
