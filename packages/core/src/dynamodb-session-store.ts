import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { ISessionStore, SessionData } from './session-store';
import { Logger, LogLevel } from './logger';

export const DEFAULT_TABLE_NAME = 'leanmcp-sessions';
export const DEFAULT_TTL_SECONDS = 86400; // 24 hours

export interface DynamoDBSessionStoreOptions {
  tableName?: string;
  region?: string;
  ttlSeconds?: number;
  logging?: boolean;
}

/**
 * DynamoDB-backed session store for stateful Lambda MCP servers
 * Automatically handles session persistence across Lambda container recycling
 */
export class DynamoDBSessionStore implements ISessionStore {
  private client: DynamoDBDocumentClient;
  private tableName: string;
  private ttlSeconds: number;
  private logger: Logger;

  constructor(options?: DynamoDBSessionStoreOptions) {
    this.tableName = options?.tableName || process.env.DYNAMODB_TABLE_NAME || DEFAULT_TABLE_NAME;
    this.ttlSeconds = options?.ttlSeconds || DEFAULT_TTL_SECONDS;

    this.logger = new Logger({
      level: options?.logging ? LogLevel.INFO : LogLevel.NONE,
      prefix: 'DynamoDBSessionStore',
    });

    const dynamoClient = new DynamoDBClient({
      region: options?.region || process.env.AWS_REGION || 'us-east-1',
    });
    this.client = DynamoDBDocumentClient.from(dynamoClient);

    this.logger.info(`Initialized with table: ${this.tableName}, TTL: ${this.ttlSeconds}s`);
  }

  /**
   * Check if a session exists in DynamoDB
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    try {
      const result = await this.client.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { sessionId },
          ProjectionExpression: 'sessionId',
        })
      );

      const exists = !!result.Item;
      this.logger.debug(`Session ${sessionId} exists: ${exists}`);
      return exists;
    } catch (error: any) {
      this.logger.error(`Error checking session existence: ${error.message}`);
      // On error, assume session doesn't exist (fail closed)
      return false;
    }
  }

  /**
   * Create a new session in DynamoDB
   */
  async createSession(sessionId: string, data?: Record<string, any>): Promise<void> {
    try {
      const now = new Date();
      const ttl = Math.floor(Date.now() / 1000) + this.ttlSeconds;

      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: {
            sessionId,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            ttl,
            data: data || {},
          },
        })
      );

      this.logger.info(
        `Created session: ${sessionId} (TTL: ${new Date(ttl * 1000).toISOString()})`
      );
    } catch (error: any) {
      this.logger.error(`Error creating session ${sessionId}: ${error.message}`);
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  /**
   * Get session data from DynamoDB
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const result = await this.client.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { sessionId },
        })
      );

      if (!result.Item) {
        this.logger.debug(`Session ${sessionId} not found`);
        return null;
      }

      const sessionData: SessionData = {
        sessionId: result.Item.sessionId,
        createdAt: new Date(result.Item.createdAt),
        updatedAt: new Date(result.Item.updatedAt),
        ttl: result.Item.ttl,
        data: result.Item.data,
      };

      this.logger.debug(`Retrieved session: ${sessionId}`);
      return sessionData;
    } catch (error: any) {
      this.logger.error(`Error getting session ${sessionId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Update session data in DynamoDB
   * Automatically refreshes TTL on each update
   */
  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    try {
      const ttl = Math.floor(Date.now() / 1000) + this.ttlSeconds;

      await this.client.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { sessionId },
          UpdateExpression: 'SET updatedAt = :now, #data = :data, #ttl = :ttl',
          ExpressionAttributeNames: {
            '#data': 'data',
            '#ttl': 'ttl',
          },
          ExpressionAttributeValues: {
            ':now': new Date().toISOString(),
            ':data': updates.data || {},
            ':ttl': ttl,
          },
        })
      );

      this.logger.debug(`Updated session: ${sessionId}`);
    } catch (error: any) {
      this.logger.error(`Error updating session ${sessionId}: ${error.message}`);
      throw new Error(`Failed to update session: ${error.message}`);
    }
  }

  /**
   * Delete a session from DynamoDB
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { sessionId },
        })
      );

      this.logger.info(`Deleted session: ${sessionId}`);
    } catch (error: any) {
      this.logger.error(`Error deleting session ${sessionId}: ${error.message}`);
      // Don't throw on delete errors - session cleanup is best-effort
    }
  }
}
