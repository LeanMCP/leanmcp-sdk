import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { DynamoDBSessionStore } from './dynamodb-session-store';
import { InMemorySessionStore } from './inmemory-session-store';
import type { ISessionStore } from './session-store';

export interface LeanMCPSessionProviderOptions {
  tableName?: string;
  region?: string;
  ttlSeconds?: number;
  logging?: boolean;
  sessionStore?: ISessionStore;
  /**
   * Force DynamoDB even when not on Lambda (for local testing with real DynamoDB)
   */
  forceDynamoDB?: boolean;
}

/**
 * Drop-in replacement for Map<string, StreamableHTTPServerTransport>
 * Provides automatic session persistence for Lambda deployments
 *
 * Environment auto-detection:
 * - Local development (default): Uses in-memory session store
 * - LeanMCP Lambda (LEANMCP_LAMBDA=true): Uses DynamoDB session store
 * - Explicit override: Pass sessionStore option or forceDynamoDB: true
 *
 * @example
 * // Before: const transports = new Map<string, StreamableHTTPServerTransport>();
 * // After:  const sessions = new LeanMCPSessionProvider();
 *
 * // Then use sessions.get(), sessions.set(), sessions.getOrRecreate()
 */
export class LeanMCPSessionProvider {
  private transports = new Map<string, StreamableHTTPServerTransport>();
  private sessionStore: ISessionStore;
  private isUsingDynamoDB: boolean;

  constructor(options?: LeanMCPSessionProviderOptions) {
    // Priority: explicit sessionStore > forceDynamoDB > auto-detect
    if (options?.sessionStore) {
      this.sessionStore = options.sessionStore;
      this.isUsingDynamoDB = false;
    } else if (options?.forceDynamoDB || process.env.LEANMCP_LAMBDA === 'true') {
      // Use DynamoDB when on Lambda or explicitly requested
      this.sessionStore = new DynamoDBSessionStore({
        tableName: options?.tableName,
        region: options?.region,
        ttlSeconds: options?.ttlSeconds,
        logging: options?.logging,
      });
      this.isUsingDynamoDB = true;
      if (options?.logging) {
        console.log('[LeanMCPSessionProvider] Using DynamoDB session store');
      }
    } else {
      // Default: in-memory for local development
      this.sessionStore = new InMemorySessionStore();
      this.isUsingDynamoDB = false;
      if (options?.logging) {
        console.log('[LeanMCPSessionProvider] Using in-memory session store (local dev mode)');
      }
    }
  }

  /**
   * Check if using DynamoDB (useful for debugging)
   */
  get usingDynamoDB(): boolean {
    return this.isUsingDynamoDB;
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
   * This is the key method for Lambda support - handles container recycling
   *
   * @param sessionId - Session ID to get or recreate
   * @param serverFactory - Factory function to create fresh MCP server instances
   * @param transportOptions - Optional callbacks for transport lifecycle events
   * @returns Transport instance or null if session doesn't exist
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

    // 3. Recreate transport with existing session ID
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
      onsessioninitialized: (sid) => {
        this.transports.set(sid, transport);
        transportOptions?.onsessioninitialized?.(sid);
      },
    });

    // Store immediately - onsessioninitialized only fires on initialize requests
    this.transports.set(sessionId, transport);

    // CRITICAL: Set the transport's internal _initialized flag
    // The MCP SDK transport rejects non-init requests if this flag is false
    // Since we're restoring an already-initialized session, we bypass this check
    const webTransport = (transport as any)._webStandardTransport;
    if (webTransport) {
      webTransport._initialized = true;
      webTransport.sessionId = sessionId;
    }

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

  /**
   * Get all session IDs in memory
   */
  keys(): IterableIterator<string> {
    return this.transports.keys();
  }

  /**
   * Get all transports in memory
   */
  values(): IterableIterator<StreamableHTTPServerTransport> {
    return this.transports.values();
  }

  /**
   * Iterate over all sessions in memory
   */
  entries(): IterableIterator<[string, StreamableHTTPServerTransport]> {
    return this.transports.entries();
  }

  /**
   * Clear all in-memory transports (does not affect DynamoDB)
   */
  clear(): void {
    this.transports.clear();
  }
}
