import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { DynamoDBSessionStore } from './dynamodb-session-store';
import type { ISessionStore } from './session-store';

export interface LeanMCPSessionProviderOptions {
  tableName?: string;
  region?: string;
  ttlSeconds?: number;
  logging?: boolean;
  sessionStore?: ISessionStore;
}

/**
 * Drop-in replacement for Map<string, StreamableHTTPServerTransport>
 * Provides automatic session persistence for Lambda deployments
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

  constructor(options?: LeanMCPSessionProviderOptions) {
    // Use provided session store or create DynamoDB store
    if (options?.sessionStore) {
      this.sessionStore = options.sessionStore;
    } else {
      this.sessionStore = new DynamoDBSessionStore({
        tableName: options?.tableName,
        region: options?.region,
        ttlSeconds: options?.ttlSeconds,
        logging: options?.logging,
      });
    }
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
