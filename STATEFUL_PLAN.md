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
Request 2: tools/call with mcp-session-id: abc123
├── Container B starts
├── transports["abc123"] = undefined
├── ⭐ Check DynamoDB: session "abc123" exists? YES
├── ⭐ Recreate transport with same session ID
├── Connect fresh MCP server to transport
└── ✅ Handle request successfully
```

---

## Implementation Overview

### End User Experience (Target)

**For Native MCP SDK users (1-2 lines):**
```typescript
import { LeanMCPSessionProvider } from '@leanmcp/lambda';

// Replace this:
const transports = new Map<string, StreamableHTTPServerTransport>();

// With this:
const sessions = new LeanMCPSessionProvider();
```

**For LeanMCP SDK users (zero changes if using `stateful: true`):**
```typescript
await createHTTPServer({
  name: 'my-server',
  stateless: false,  // Enable stateful mode
  // DynamoDB automatically used when running on LeanMCP Lambda
});
```

---

## Part 1: LeanMCP SDK Changes

### Epic: Stateful Lambda Sessions in LeanMCP SDK

---

### Ticket 1.1: Add ISessionStore Interface

**Type:** Feature  
**Priority:** High  
**Estimate:** 2 hours

**Description:**
Create a session store abstraction interface in `http-server.ts`.

**Acceptance Criteria:**
- [ ] `ISessionStore` interface defined with methods:
  - `sessionExists(sessionId: string): Promise<boolean>`
  - `createSession(sessionId: string, data?: any): Promise<void>`
  - `getSession(sessionId: string): Promise<SessionData | null>`
  - `updateSession(sessionId: string, data: Partial<SessionData>): Promise<void>`
  - `deleteSession(sessionId: string): Promise<void>`
- [ ] `SessionData` type defined with `createdAt`, `updatedAt`, `ttl`, and generic `data` field
- [ ] Interface exported from `@leanmcp/core`

**File:** `packages/core/src/http-server.ts`

**Code:**
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

### Ticket 1.2: Add sessionStore Option to HTTPServerOptions

**Type:** Feature  
**Priority:** High  
**Estimate:** 1 hour

**Description:**
Add `sessionStore` configuration option to `HTTPServerOptions`.

**Acceptance Criteria:**
- [ ] `sessionStore?: ISessionStore` added to `HTTPServerOptions`
- [ ] When provided, used for session persistence
- [ ] When not provided, falls back to in-memory only (current behavior)

**File:** `packages/core/src/http-server.ts`

**Code:**
```typescript
export interface HTTPServerOptions {
  port?: number;
  cors?: boolean | { origin?: string | string[]; credentials?: boolean };
  logging?: boolean;
  logger?: Logger;
  sessionTimeout?: number;
  stateless?: boolean;
  dashboard?: boolean;
  auth?: HTTPServerAuthOptions;
  sessionStore?: ISessionStore;  // NEW
}
```

---

### Ticket 1.3: Implement Transport Recreation in handleMCPRequestStateful

**Type:** Feature  
**Priority:** Critical  
**Estimate:** 4 hours

**Description:**
Modify `handleMCPRequestStateful` to recreate transports when session exists in DynamoDB but transport is missing from memory.

**Acceptance Criteria:**
- [ ] Add new branch between existing `if (sessionId && transports[sessionId])` and `else if (!sessionId && isInitializeRequest)`
- [ ] New branch handles: session ID provided, transport missing, NOT an initialize request
- [ ] Check `sessionStore.sessionExists(sessionId)` before recreating
- [ ] Return 404 if session doesn't exist in store
- [ ] Recreate transport with `sessionIdGenerator: () => sessionId` (reuse existing ID)
- [ ] Create fresh MCP server via `serverFactory()`
- [ ] Connect server to recreated transport
- [ ] Handle request normally

**File:** `packages/core/src/http-server.ts`

**Location:** Lines 480-514 in `handleMCPRequestStateful`

**Code:**
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

### Ticket 1.4: Create DynamoDB Session Store Implementation

**Type:** Feature  
**Priority:** High  
**Estimate:** 3 hours

**Description:**
Create a DynamoDB implementation of `ISessionStore` in a new package `@leanmcp/lambda`.

**Acceptance Criteria:**
- [ ] Create new package `packages/lambda`
- [ ] Implement `DynamoDBSessionStore` class
- [ ] Auto-create table if not exists (with TTL)
- [ ] Use environment variables: `DYNAMODB_TABLE_NAME`, `AWS_REGION`
- [ ] Default table name: `leanmcp-sessions`
- [ ] TTL support (default 24 hours)
- [ ] Export from `@leanmcp/lambda`

**Files:**
- `packages/lambda/package.json`
- `packages/lambda/src/index.ts`
- `packages/lambda/src/dynamodb-session-store.ts`

**Code (dynamodb-session-store.ts):**
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

### Ticket 1.5: Auto-detect LeanMCP Lambda Environment

**Type:** Feature  
**Priority:** Medium  
**Estimate:** 2 hours

**Description:**
Auto-configure DynamoDB session store when running on LeanMCP Lambda platform.

**Acceptance Criteria:**
- [ ] Detect `LEANMCP_LAMBDA=true` environment variable
- [ ] Auto-create `DynamoDBSessionStore` when detected and `stateless: false`
- [ ] Log message indicating auto-configuration
- [ ] Allow explicit `sessionStore` option to override auto-detection

**File:** `packages/core/src/http-server.ts`

**Code:**
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

### Epic: LeanMCP Session Provider for Native SDK

For users who use the official `@modelcontextprotocol/sdk` directly and want to deploy on LeanMCP Lambda.

---

### Ticket 2.1: Create LeanMCPSessionProvider Class

**Type:** Feature  
**Priority:** High  
**Estimate:** 4 hours

**Description:**
Create a drop-in replacement for `Map<string, StreamableHTTPServerTransport>` that handles transport recreation automatically.

**Acceptance Criteria:**
- [ ] `LeanMCPSessionProvider` class with Map-like interface
- [ ] `get(sessionId)` checks memory first, then DynamoDB
- [ ] `set(sessionId, transport)` stores in both memory and DynamoDB
- [ ] `delete(sessionId)` removes from both
- [ ] `has(sessionId)` checks memory first, then DynamoDB
- [ ] `getOrRecreate(sessionId, serverFactory)` method for transport recreation
- [ ] Exported from `@leanmcp/lambda`

**File:** `packages/lambda/src/session-provider.ts`

**Code:**
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

### Ticket 2.2: Create Usage Example for Native SDK

**Type:** Documentation  
**Priority:** Medium  
**Estimate:** 2 hours

**Description:**
Create example showing how to use `LeanMCPSessionProvider` with native MCP SDK.

**File:** `packages/lambda/examples/native-sdk-example.ts`

**Code:**
```typescript
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { LeanMCPSessionProvider } from '@leanmcp/lambda';
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

### Ticket 2.3: Create NPM Package @leanmcp/lambda

**Type:** Feature  
**Priority:** High  
**Estimate:** 2 hours

**Description:**
Set up the `@leanmcp/lambda` package with proper exports.

**Acceptance Criteria:**
- [ ] `packages/lambda/package.json` with dependencies
- [ ] Export `DynamoDBSessionStore`
- [ ] Export `LeanMCPSessionProvider`
- [ ] Export `ISessionStore` interface (re-export from core)
- [ ] Peer dependencies: `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`

**File:** `packages/lambda/package.json`

```json
{
  "name": "@leanmcp/lambda",
  "version": "0.1.0",
  "description": "Lambda support for LeanMCP with DynamoDB session persistence",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.700.0",
    "@aws-sdk/lib-dynamodb": "^3.700.0"
  },
  "peerDependencies": {
    "@leanmcp/core": "^0.1.0",
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

**File:** `packages/lambda/src/index.ts`

```typescript
export { DynamoDBSessionStore, DEFAULT_TABLE_NAME } from './dynamodb-session-store';
export { LeanMCPSessionProvider } from './session-provider';
export type { ISessionStore, SessionData } from '@leanmcp/core';
```

---

## Part 3: LeanMCP Lambda Platform

### Epic: Platform-Level DynamoDB Configuration

---

### Ticket 3.1: Pre-create DynamoDB Table in LeanMCP Lambda

**Type:** Infrastructure  
**Priority:** High  
**Estimate:** 2 hours

**Description:**
Ensure the `leanmcp-sessions` DynamoDB table exists for all LeanMCP Lambda deployments.

**Acceptance Criteria:**
- [ ] Table `leanmcp-sessions` created in each supported region
- [ ] Partition key: `sessionId` (String)
- [ ] TTL attribute: `ttl` (Number)
- [ ] On-demand capacity mode
- [ ] IAM role attached to Lambda has full access to this table

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

### Ticket 3.2: Set Environment Variables in LeanMCP Lambda

**Type:** Infrastructure  
**Priority:** High  
**Estimate:** 1 hour

**Description:**
Automatically set required environment variables for deployed Lambda functions.

**Acceptance Criteria:**
- [ ] `LEANMCP_LAMBDA=true` set on all deployments
- [ ] `DYNAMODB_TABLE_NAME=leanmcp-sessions` set
- [ ] `AWS_REGION` set to deployment region

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
import { LeanMCPSessionProvider } from '@leanmcp/lambda';

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

---

## Timeline Estimate

| Phase | Tickets | Estimate |
|-------|---------|----------|
| Phase 1: LeanMCP SDK Core | 1.1 - 1.5 | 12 hours |
| Phase 2: Native SDK Support | 2.1 - 2.3 | 8 hours |
| Phase 3: Platform Setup | 3.1 - 3.2 | 3 hours |
| **Total** | | **23 hours** |
