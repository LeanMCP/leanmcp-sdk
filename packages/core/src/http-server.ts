import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { randomUUID } from "node:crypto";

export interface HTTPServerOptions {
  port?: number;
  cors?: boolean | {
    origin?: string | string[];
    credentials?: boolean;
  };
  logging?: boolean;
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

  if (options.logging) {
    console.log("Starting LeanMCP HTTP Server...");
  }

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
        if (options.logging) {
          console.log(`Reusing session: ${sessionId}`);
        }
      } else if (!sessionId && isInitializeRequest(req.body)) {
        if (options.logging) {
          console.log("Creating new MCP session...");
        }

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId: string) => {
            transports[newSessionId] = transport;
            if (options.logging) {
              console.log(`Session initialized: ${newSessionId}`);
            }
          }
        });

        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
            if (options.logging) {
              console.log(`Session cleaned up: ${transport.sessionId}`);
            }
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
      console.error('ERROR: Error handling MCP request:', error);
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
    if (options.logging) {
      console.log('\nShutting down server...');
    }
    Object.values(transports).forEach(t => t.close?.());
    process.exit(0);
  });

  return new Promise((resolve) => {
    app.listen(port, () => {
      if (options.logging) {
        console.log(`Server running on http://localhost:${port}`);
        console.log(`MCP endpoint: http://localhost:${port}/mcp`);
        console.log(`Health check: http://localhost:${port}/health`);
      }
      resolve();
    });
  });
}
