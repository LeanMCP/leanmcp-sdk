/**
 * Session data stored in persistent storage (e.g., DynamoDB)
 */
export interface SessionData {
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
  ttl?: number;
  data?: Record<string, any>;
}

/**
 * Interface for session storage backends
 * Implementations can use DynamoDB, Redis, or other persistent stores
 */
export interface ISessionStore {
  /**
   * Check if a session exists in the store
   */
  sessionExists(sessionId: string): Promise<boolean>;

  /**
   * Create a new session in the store
   */
  createSession(sessionId: string, data?: Record<string, any>): Promise<void>;

  /**
   * Get session data from the store
   */
  getSession(sessionId: string): Promise<SessionData | null>;

  /**
   * Update session data in the store
   */
  updateSession(sessionId: string, data: Partial<SessionData>): Promise<void>;

  /**
   * Delete a session from the store
   */
  deleteSession(sessionId: string): Promise<void>;
}
