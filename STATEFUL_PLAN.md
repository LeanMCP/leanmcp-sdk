# Stateful Lambda Sessions - Implementation Plan

## Problem Statement

MCP servers deployed on AWS Lambda lose in-memory state when containers recycle. This causes:
- `transports[sessionId]` to be `undefined` on subsequent requests
- 400 Bad Request errors for valid session IDs
- Broken stateful workflows (counters, history, multi-step operations)

### Two Separate Problems

| Component | Description | Persistable? | Solution |
|-----------|-------------|--------------|----------|
| **Transport** | HTTP connection object (`StreamableHTTPServerTransport`) | ❌ No | Recreate on-demand |
| **Session Data** | User state (totals, history, context) | ✅ Yes | DynamoDB |

### Current Flow (Broken on Lambda)

```
Request 1: initialize
├── Container A starts
├── Creates transport → transports["abc123"] = transport
└── Returns session ID: abc123

     ↓ Lambda recycles ↓

Request 2: tools/call with mcp-session-id: abc123
├── Container B starts (fresh memory)
├── transports = {} (empty!)
├── transports["abc123"] = undefined
└── ❌ Returns 400 Bad Request
```

### Target Flow (Fixed)

```
Request 1: initialize (first request)
├── Container A starts
├── Creates transport with sessionIdGenerator: () => randomUUID()
├── Transport generates session ID: "abc123"
├── ⭐ Store in memory: transports["abc123"] = transport
├── ⭐ Store in DynamoDB: sessions.createSession("abc123")
├── Returns response with mcp-session-id: abc123
└── ✅ Client saves session ID for future requests

     ↓ Lambda recycles (or different container) ↓

Request 2: tools/call with mcp-session-id: abc123
├── Container B starts (fresh memory)
├── transports["abc123"] = undefined (memory is empty!)
├── ⭐ Check DynamoDB: session "abc123" exists? YES
├── ⭐ Recreate transport with sessionIdGenerator: () => "abc123" (reuse ID!)
├── Store in memory: transports["abc123"] = newTransport
├── Create fresh MCP server instance
├── Connect server to recreated transport
├── Handle the request normally
└── ✅ Session continues seamlessly
```

---

## Implementation Overview

### End User Experience (Target)

**For Native MCP SDK users (1-2 lines):**
```typescript
import { LeanMCPSessionProvider } from '@leanmcp/core';

// Replace this:
const transports = new Map<string, StreamableHTTPServerTransport>();

// With this:
const sessions = new LeanMCPSessionProvider();
```

**For LeanMCP SDK users (zero changes if using `stateless: false`):**
```typescript
await createHTTPServer({
  name: 'my-server',
  stateless: false,  // Enable stateful mode
  // DynamoDB automatically used when running on LeanMCP Lambda
});
```

---

## Part 1: LeanMCP SDK Changes (`@leanmcp/core`)

### 1.1 Add ISessionStore Interface

**File:** `packages/core/src/http-server.ts`

- Add `ISessionStore` interface with methods: `sessionExists`, `createSession`, `getSession`, `updateSession`, `deleteSession`
- Add `SessionData` type
- Export from `@leanmcp/core`

```typescript
export interface SessionData {
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
  ttl?: number;
  data?: Record<string, any>;
}

export interface ISessionStore {
  sessionExists(sessionId: string): Promise<boolean>;
  createSession(sessionId: string, data?: Record<string, any>): Promise<void>;
  getSession(sessionId: string): Promise<SessionData | null>;
  updateSession(sessionId: string, data: Partial<SessionData>): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
}
```

---

### 1.2 Add sessionStore to HTTPServerOptions

**File:** `packages/core/src/http-server.ts`

- Add `sessionStore?: ISessionStore` to `HTTPServerOptions`
- When provided, use for session persistence
- When not provided, fallback to in-memory only

```typescript
export interface HTTPServerOptions {
  // ... existing options
  sessionStore?: ISessionStore;  // NEW
}
```

---

### 1.3 Implement Transport Recreation in handleMCPRequestStateful

**File:** `packages/core/src/http-server.ts`  
**Location:** Lines 480-514 in `handleMCPRequestStateful`

- Add new branch between `if (sessionId && transports[sessionId])` and `else if (!sessionId && isInitializeRequest)`
- New branch handles: session ID provided, transport missing, NOT an initialize request
- Check `sessionStore.sessionExists(sessionId)` before recreating
- Return 404 if session doesn't exist in store
- Recreate transport with `sessionIdGenerator: () => sessionId` (reuse existing ID)
- Create fresh MCP server via `serverFactory()`
- Connect server to recreated transport
```typescript
const handleMCPRequestStateful = async (req: any, res: any) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: any;

  // ... logging code ...

  try {
    if (sessionId && transports[sessionId]) {
      // ✅ Transport exists in memory - reuse it
      transport = transports[sessionId];
      logger.debug(`Reusing session: ${sessionId}`);
      
    } else if (sessionId && !isInitializeRequest(req.body)) {
      // ⭐ NEW: Session ID provided but transport missing (Lambda recycled)
      logger.info(`Transport missing for session ${sessionId}, checking session store...`);
      
      // Check if session exists in persistent store
      if (httpOptions.sessionStore) {
        const exists = await httpOptions.sessionStore.sessionExists(sessionId);
        if (!exists) {
          res.status(404).json({
            jsonrpc: '2.0',
            error: { code: -32001, message: 'Session not found' },
            id: req.body?.id || null
          });
          return;
        }
        
        // Recreate transport with existing session ID
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sessionId,  // Reuse existing ID
          onsessioninitialized: (sid: string) => {
            transports[sid] = transport;
            logger.info(`Transport recreated for session: ${sid}`);
          }
        });
        
        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
            logger.debug(`Session cleaned up: ${transport.sessionId}`);
          }
        };
        
        // Create fresh MCP server and connect
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
          id: req.body?.id || null
        });
        return;
      }
      
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // ✅ New session - create transport
      logger.info("Creating new MCP session...");
      
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: async (newSessionId: string) => {
          transports[newSessionId] = transport;
          logger.info(`Session initialized: ${newSessionId}`);
          
          // ⭐ NEW: Persist session to store
          if (httpOptions.sessionStore) {
            await httpOptions.sessionStore.createSession(newSessionId);
          }
        }
      });
      
      transport.onclose = async () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
          logger.debug(`Session cleaned up: ${transport.sessionId}`);
          
          // ⭐ NEW: Remove from session store
          if (httpOptions.sessionStore) {
            await httpOptions.sessionStore.deleteSession(transport.sessionId);
          }
        }
      };
      
      if (!mcpServer) {
        throw new Error('MCP server not initialized');
      }
      await (mcpServer as Server).connect(transport);
      
    } else {
      // Invalid request
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: Invalid session or not an init request' },
        id: null
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error: any) {
    // ... error handling ...
  }
};
```

---

### 1.4 Create DynamoDB Session Store Implementation

**File:** `packages/core/src/dynamodb-session-store.ts`

- Implement `DynamoDBSessionStore` class that implements `ISessionStore`
- Auto-create table if not exists (with TTL enabled)
- Use environment variables: `DYNAMODB_TABLE_NAME`, `AWS_REGION`
- Default table name: `leanmcp-sessions`
- TTL support (default 24 hours)
- Export from `@leanmcp/core`
```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  DeleteCommand,
  UpdateCommand 
} from '@aws-sdk/lib-dynamodb';
import type { ISessionStore, SessionData } from '@leanmcp/core';

export const DEFAULT_TABLE_NAME = 'leanmcp-sessions';

export class DynamoDBSessionStore implements ISessionStore {
  private client: DynamoDBDocumentClient;
  private tableName: string;
  private ttlSeconds: number;

  constructor(options?: {
    tableName?: string;
    region?: string;
    ttlSeconds?: number;
  }) {
    this.tableName = options?.tableName || process.env.DYNAMODB_TABLE_NAME || DEFAULT_TABLE_NAME;
    this.ttlSeconds = options?.ttlSeconds || 86400; // 24 hours
    
    const dynamoClient = new DynamoDBClient({
      region: options?.region || process.env.AWS_REGION || 'us-east-1',
    });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { sessionId },
      ProjectionExpression: 'sessionId',
    }));
    return !!result.Item;
  }

  async createSession(sessionId: string, data?: Record<string, any>): Promise<void> {
    const now = new Date();
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        sessionId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        ttl: Math.floor(Date.now() / 1000) + this.ttlSeconds,
        data: data || {},
      },
    }));
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { sessionId },
    }));
    if (!result.Item) return null;
    return {
      sessionId: result.Item.sessionId,
      createdAt: new Date(result.Item.createdAt),
      updatedAt: new Date(result.Item.updatedAt),
      ttl: result.Item.ttl,
      data: result.Item.data,
    };
  }

  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    await this.client.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { sessionId },
      UpdateExpression: 'SET updatedAt = :now, #data = :data, #ttl = :ttl',
      ExpressionAttributeNames: { '#data': 'data', '#ttl': 'ttl' },
      ExpressionAttributeValues: {
        ':now': new Date().toISOString(),
        ':data': updates.data || {},
        ':ttl': Math.floor(Date.now() / 1000) + this.ttlSeconds,
      },
    }));
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { sessionId },
    }));
  }
}
```

---

### 1.5 Auto-detect LeanMCP Lambda Environment

**File:** `packages/core/src/http-server.ts`

- Detect `LEANMCP_LAMBDA=true` environment variable
- Auto-create `DynamoDBSessionStore` when detected and `stateless: false`
- Log message indicating auto-configuration
- Allow explicit `sessionStore` option to override auto-detection
```typescript
// In createHTTPServer, before setting up routes:
if (!isStateless && !httpOptions.sessionStore) {
  // Auto-detect LeanMCP Lambda environment
  if (process.env.LEANMCP_LAMBDA === 'true') {
    try {
      const { DynamoDBSessionStore } = await import('@leanmcp/lambda');
      httpOptions.sessionStore = new DynamoDBSessionStore();
      logger.info('Auto-configured DynamoDB session store for LeanMCP Lambda');
    } catch (e) {
      logger.warn('Running on LeanMCP Lambda but @leanmcp/lambda not installed');
    }
  }
}
```

---

## Part 2: Native MCP SDK Support

For users who use the official `@modelcontextprotocol/sdk` directly and want to deploy on LeanMCP Lambda.

---

### 2.1 Create LeanMCPSessionProvider Class

**File:** `packages/core/src/session-provider.ts`

- `LeanMCPSessionProvider` class - drop-in replacement for `Map<string, StreamableHTTPServerTransport>`
- `get(sessionId)` - get transport from memory
- `set(sessionId, transport)` - store in memory AND DynamoDB
- `delete(sessionId)` - remove from both
- `has(sessionId)` - check memory first, then DynamoDB
- `getOrRecreate(sessionId, serverFactory)` - **key method** for transport recreation
- `getSessionData(sessionId)` / `updateSessionData(sessionId, data)` - read/write user data
- Export from `@leanmcp/core`
```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { DynamoDBSessionStore } from './dynamodb-session-store';

export class LeanMCPSessionProvider {
  private transports = new Map<string, StreamableHTTPServerTransport>();
  private sessionStore: DynamoDBSessionStore;

  constructor(options?: { tableName?: string; region?: string }) {
    this.sessionStore = new DynamoDBSessionStore(options);
  }

  /**
   * Get transport from memory
   */
  get(sessionId: string): StreamableHTTPServerTransport | undefined {
    return this.transports.get(sessionId);
  }

  /**
   * Check if session exists (memory or DynamoDB)
   */
  async has(sessionId: string): Promise<boolean> {
    if (this.transports.has(sessionId)) return true;
    return this.sessionStore.sessionExists(sessionId);
  }

  /**
   * Store transport and create session in DynamoDB
   */
  async set(sessionId: string, transport: StreamableHTTPServerTransport): Promise<void> {
    this.transports.set(sessionId, transport);
    await this.sessionStore.createSession(sessionId);
  }

  /**
   * Delete transport and session
   */
  async delete(sessionId: string): Promise<void> {
    this.transports.delete(sessionId);
    await this.sessionStore.deleteSession(sessionId);
  }

  /**
   * Get or recreate transport for a session
   * This is the key method for Lambda support
   */
  async getOrRecreate(
    sessionId: string,
    serverFactory: () => Server | Promise<Server>,
    transportOptions?: {
      onsessioninitialized?: (sid: string) => void;
      onclose?: () => void;
    }
  ): Promise<StreamableHTTPServerTransport | null> {
    // 1. Check memory first
    const existing = this.transports.get(sessionId);
    if (existing) return existing;

    // 2. Check DynamoDB
    const exists = await this.sessionStore.sessionExists(sessionId);
    if (!exists) return null;

    // 3. Recreate transport
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
      onsessioninitialized: (sid) => {
        this.transports.set(sid, transport);
        transportOptions?.onsessioninitialized?.(sid);
      },
    });

    transport.onclose = () => {
      this.transports.delete(sessionId);
      transportOptions?.onclose?.();
    };

    // 4. Connect to fresh server
    const server = await serverFactory();
    await server.connect(transport);

    return transport;
  }

  /**
   * Get session data from DynamoDB
   */
  async getSessionData(sessionId: string): Promise<Record<string, any> | null> {
    const session = await this.sessionStore.getSession(sessionId);
    return session?.data || null;
  }

  /**
   * Update session data in DynamoDB
   */
  async updateSessionData(sessionId: string, data: Record<string, any>): Promise<void> {
    await this.sessionStore.updateSession(sessionId, { data });
  }

  /**
   * Get number of in-memory transports
   */
  get size(): number {
    return this.transports.size;
  }
}
```

---

### 2.2 Usage Example for Native SDK

Example showing how to use `LeanMCPSessionProvider` with native MCP SDK:

```typescript
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { LeanMCPSessionProvider } from '@leanmcp/core';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const app = express();
app.use(express.json());

// ⭐ ONE LINE CHANGE: Replace Map with LeanMCPSessionProvider
const sessions = new LeanMCPSessionProvider();

// Your MCP server factory
function createServer() {
  const server = new McpServer({
    name: 'my-server',
    version: '1.0.0',
  });

  server.tool('add', { number: z.number() }, async ({ number }, extra) => {
    const sessionId = extra.sessionId;
    
    // ⭐ Get/update session data from DynamoDB
    const data = await sessions.getSessionData(sessionId) || { total: 0 };
    data.total += number;
    await sessions.updateSessionData(sessionId, data);
    
    return { content: [{ type: 'text', text: `Total: ${data.total}` }] };
  });

  return server;
}

// Helper to check if request is initialize
function isInitializeRequest(body: any): boolean {
  return body?.method === 'initialize';
}

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && sessions.get(sessionId)) {
      // ✅ Transport exists in memory
      transport = sessions.get(sessionId)!;
      
    } else if (sessionId && !isInitializeRequest(req.body)) {
      // ⭐ KEY: Transport missing but session might exist in DynamoDB
      const recreated = await sessions.getOrRecreate(sessionId, createServer);
      if (!recreated) {
        return res.status(404).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Session not found' },
          id: req.body?.id || null,
        });
      }
      transport = recreated;
      
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // ✅ New session
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: async (newSessionId) => {
          await sessions.set(newSessionId, transport);
        },
      });

      transport.onclose = async () => {
        const sid = transport.sessionId;
        if (sid) await sessions.delete(sid);
      };

      const server = createServer();
      await server.connect(transport);
      
    } else {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request' },
        id: null,
      });
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal error' },
        id: null,
      });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

---

### 2.3 Export from @leanmcp/core

**File:** `packages/core/src/index.ts`

- Export `DynamoDBSessionStore`
- Export `LeanMCPSessionProvider`
- Export `ISessionStore` interface
- Export `SessionData` type

```typescript
export { DynamoDBSessionStore, DEFAULT_TABLE_NAME } from './dynamodb-session-store';
export { LeanMCPSessionProvider } from './session-provider';
export type { ISessionStore, SessionData } from './http-server';
```

---

## Part 3: LeanMCP Lambda Platform (Infrastructure)

### 3.1 Pre-create DynamoDB Table

- Table `leanmcp-sessions` created in each supported region
- Partition key: `sessionId` (String)
- TTL attribute: `ttl` (Number)
- On-demand capacity mode
- IAM role attached to Lambda has full access to this table

**Table Schema:**
```
Table: leanmcp-sessions
├── sessionId (String) - Partition Key
├── createdAt (String) - ISO timestamp
├── updatedAt (String) - ISO timestamp
├── ttl (Number) - Unix timestamp for TTL
└── data (Map) - User session data
```

---

### 3.2 Set Environment Variables

Automatically set on all LeanMCP Lambda deployments:

- `LEANMCP_LAMBDA=true`
- `DYNAMODB_TABLE_NAME=leanmcp-sessions`
- `AWS_REGION` set to deployment region

---

## Summary: User Experience

### For LeanMCP SDK Users

```typescript
// server.ts
import { createHTTPServer } from '@leanmcp/core';

await createHTTPServer({
  name: 'my-server',
  version: '1.0.0',
  stateless: false,  // ⭐ Just set this to false
  // DynamoDB auto-configured on LeanMCP Lambda!
});
```

### For Native MCP SDK Users

```typescript
// server.ts
import { LeanMCPSessionProvider } from '@leanmcp/core';

// ⭐ Replace: const transports = new Map();
const sessions = new LeanMCPSessionProvider();

// Then use sessions.get(), sessions.set(), sessions.getOrRecreate()
```

---

## Testing Checklist

- [ ] Local development works (in-memory fallback)
- [ ] Lambda cold start with fresh session
- [ ] Lambda warm start with existing session
- [ ] Lambda container recycle - session survives
- [ ] Session TTL expires after 24 hours
- [ ] Multiple concurrent sessions
- [ ] Session data persistence across requests
- [ ] Graceful handling of DynamoDB errors

