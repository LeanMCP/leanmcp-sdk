import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { LeanMCPSessionProvider } from '@leanmcp/core';

dotenv.config();

const PORT = Number(process.env.PORT ?? 3001);

// LeanMCPSessionProvider auto-detects environment:
// - Local dev (default): Uses in-memory session store
// - Lambda (LEANMCP_LAMBDA=true): Uses DynamoDB session store
// - Explicit: Pass forceDynamoDB: true to use DynamoDB locally
const sessions = new LeanMCPSessionProvider({
  logging: true,
});

function createServer() {
  const server = new McpServer({
    name: 'test-stateful-mcp-official-sdk',
    version: '1.0.0',
  });

  server.registerTool(
    'getCounter',
    {
      description: 'Get the current per-session counter value (persisted in DynamoDB)',
      inputSchema: {},
    },
    async (_input: any, extra: any) => {
      const sid = extra?.sessionId as string | undefined;
      if (!sid) {
        throw new Error('Missing sessionId');
      }
      const data = (await sessions.getSessionData(sid)) || {};
      const value = typeof (data as any).counter === 'number' ? (data as any).counter : 0;
      return { content: [{ type: 'text', text: String(value) }] };
    }
  );

  server.registerTool(
    'increment',
    {
      description: 'Increment the per-session counter value (persisted in DynamoDB)',
      inputSchema: {},
    },
    async (_input: any, extra: any) => {
      const sid = extra?.sessionId as string | undefined;
      if (!sid) {
        throw new Error('Missing sessionId');
      }
      const data = (await sessions.getSessionData(sid)) || {};
      const current = typeof (data as any).counter === 'number' ? (data as any).counter : 0;
      const value = current + 1;
      await sessions.updateSessionData(sid, { ...data, counter: value });
      return { content: [{ type: 'text', text: String(value) }] };
    }
  );

  return server;
}

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'mcp-session-id', 'mcp-protocol-version', 'Authorization'],
  exposedHeaders: ['mcp-session-id'],
  credentials: false,
}));
app.use(express.json());

const transports: Record<string, StreamableHTTPServerTransport> = {};

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  let transport: StreamableHTTPServerTransport | undefined;

  const method = req.body?.method ?? 'unknown';
  const name = req.body?.params?.name;
  const uri = req.body?.params?.uri;
  const suffix = name ? ` [${name}]` : uri ? ` [${uri}]` : '';
  const sidShort = sessionId ? ` (session: ${sessionId.substring(0, 8)}...)` : '';
  console.log(`[HTTP] POST /mcp - ${method}${suffix}${sidShort}`);

  const isInit = req.body?.method === 'initialize';

  try {
    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInit) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: async (sid: string) => {
          transports[sid] = transport!;
          await sessions.set(sid, transport!);
          await sessions.updateSessionData(sid, { counter: 0 });
        },
      });

      transport.onclose = async () => {
        if (transport?.sessionId) {
          delete transports[transport.sessionId];
          await sessions.delete(transport.sessionId);
        }
      };

      const server = createServer();
      await (server as any).connect(transport);
    } else if (sessionId) {
      const restored = await sessions.getOrRecreate(
        sessionId,
        async () => {
          const server = createServer();
          return server as any;
        },
        {
          onsessioninitialized: (sid: string) => {
            transports[sid] = transport!;
          },
        }
      );

      if (!restored) {
        res.status(404).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Session not found' },
          id: req.body?.id ?? null,
        });
        return;
      }

      transport = restored;
      transports[sessionId] = transport;

      transport.onclose = async () => {
        if (transport?.sessionId) {
          delete transports[transport.sessionId];
          await sessions.delete(transport.sessionId);
        }
      };
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: Invalid session or not an init request' },
        id: req.body?.id ?? null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (err: any) {
    console.error('[HTTP] Error handling request', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: req.body?.id ?? null,
      });
    }
  }
});

app.get('/mcp', async (req, res) => {
  const acceptHeader = (req.headers['accept'] as string | undefined) ?? '';
  if (!acceptHeader.includes('text/event-stream')) {
    res.status(404).send('Not Found');
    return;
  }

  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  await transports[sessionId].handleRequest(req, res);
});

app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  await transports[sessionId].handleRequest(req, res);
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: 'stateful',
    sessionsInMemory: Object.keys(transports).length,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
