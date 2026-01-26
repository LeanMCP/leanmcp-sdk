import type { ISessionStore, SessionData } from './session-store';

/**
 * In-memory session store for local development
 * Sessions are stored in memory and lost when the process restarts
 *
 * This is the default for local development - no external dependencies needed
 */
export class InMemorySessionStore implements ISessionStore {
  private sessions = new Map<string, SessionData>();

  async sessionExists(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }

  async createSession(sessionId: string, data?: Record<string, any>): Promise<void> {
    const now = new Date();
    this.sessions.set(sessionId, {
      sessionId,
      createdAt: now,
      updatedAt: now,
      data: data || {},
    });
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    const existing = this.sessions.get(sessionId);
    if (!existing) return;
    this.sessions.set(sessionId, {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  /**
   * Get number of sessions (useful for debugging)
   */
  get size(): number {
    return this.sessions.size;
  }

  /**
   * Clear all sessions (useful for testing)
   */
  clear(): void {
    this.sessions.clear();
  }
}
