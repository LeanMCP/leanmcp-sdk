/**
 * File-based token storage
 *
 * Persists tokens to a JSON file for survival across restarts.
 * Optionally encrypts tokens for security.
 */

import { promises as fs } from 'fs';
import { dirname } from 'path';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import type { TokenStorage, OAuthTokens, ClientRegistration, StoredSession } from './types';
import { withExpiresAt, isTokenExpired } from './types';

interface FileStorageData {
  version: number;
  sessions: Record<
    string,
    {
      tokens: OAuthTokens;
      clientInfo?: ClientRegistration;
      createdAt: number;
      updatedAt: number;
    }
  >;
}

interface FileStorageOptions {
  /** Path to the storage file */
  filePath: string;

  /** Optional encryption key (if omitted, data stored in plaintext) */
  encryptionKey?: string;

  /** Whether to pretty-print JSON (default: false) */
  prettyPrint?: boolean;
}

const CURRENT_VERSION = 1;
const ALGORITHM = 'aes-256-gcm';

/**
 * File-based token storage with optional encryption
 *
 * @example
 * ```typescript
 * // Plaintext storage
 * const storage = new FileStorage({ filePath: '~/.leanmcp/tokens.json' });
 *
 * // Encrypted storage
 * const storage = new FileStorage({
 *   filePath: '~/.leanmcp/tokens.enc',
 *   encryptionKey: process.env.TOKEN_ENCRYPTION_KEY
 * });
 * ```
 */
export class FileStorage implements TokenStorage {
  private filePath: string;
  private encryptionKey?: Buffer;
  private prettyPrint: boolean;
  private cache: FileStorageData | null = null;
  private writePromise: Promise<void> | null = null;

  constructor(options: FileStorageOptions | string) {
    if (typeof options === 'string') {
      this.filePath = this.expandPath(options);
      this.prettyPrint = false;
    } else {
      this.filePath = this.expandPath(options.filePath);
      this.prettyPrint = options.prettyPrint ?? false;

      if (options.encryptionKey) {
        // Derive a 32-byte key from the provided key
        this.encryptionKey = scryptSync(options.encryptionKey, 'leanmcp-salt', 32);
      }
    }
  }

  /**
   * Expand ~ to home directory
   */
  private expandPath(filePath: string): string {
    if (filePath.startsWith('~')) {
      const home = process.env.HOME || process.env.USERPROFILE || '';
      return filePath.replace('~', home);
    }
    return filePath;
  }

  /**
   * Normalize server URL for consistent key lookup
   */
  private normalizeUrl(serverUrl: string): string {
    return serverUrl.replace(/\/+$/, '').toLowerCase();
  }

  /**
   * Encrypt data
   */
  private encrypt(data: string): string {
    if (!this.encryptionKey) return data;

    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt data
   */
  private decrypt(data: string): string {
    if (!this.encryptionKey) return data;

    const [ivHex, authTagHex, encrypted] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Read data from file
   */
  private async readFile(): Promise<FileStorageData> {
    if (this.cache) return this.cache;

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const decrypted = this.decrypt(raw);
      this.cache = JSON.parse(decrypted);
      return this.cache!;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return empty data
        this.cache = { version: CURRENT_VERSION, sessions: {} };
        return this.cache;
      }
      throw error;
    }
  }

  /**
   * Write data to file (coalesced to avoid race conditions)
   */
  private async writeFile(data: FileStorageData): Promise<void> {
    this.cache = data;

    // Coalesce writes
    if (this.writePromise) {
      return this.writePromise;
    }

    this.writePromise = (async () => {
      try {
        // Ensure directory exists
        await fs.mkdir(dirname(this.filePath), { recursive: true });

        const json = this.prettyPrint ? JSON.stringify(data, null, 2) : JSON.stringify(data);
        const encrypted = this.encrypt(json);

        await fs.writeFile(this.filePath, encrypted, 'utf8');
      } finally {
        this.writePromise = null;
      }
    })();

    return this.writePromise;
  }

  async getTokens(serverUrl: string): Promise<OAuthTokens | null> {
    const key = this.normalizeUrl(serverUrl);
    const data = await this.readFile();
    const session = data.sessions[key];

    if (!session) return null;

    // Check if token is expired
    if (isTokenExpired(session.tokens)) {
      // Don't delete - might have refresh token
      return session.tokens;
    }

    return session.tokens;
  }

  async setTokens(serverUrl: string, tokens: OAuthTokens): Promise<void> {
    const key = this.normalizeUrl(serverUrl);
    const data = await this.readFile();
    const now = Date.now();

    const existing = data.sessions[key];
    data.sessions[key] = {
      tokens: withExpiresAt(tokens),
      clientInfo: existing?.clientInfo,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await this.writeFile(data);
  }

  async clearTokens(serverUrl: string): Promise<void> {
    const key = this.normalizeUrl(serverUrl);
    const data = await this.readFile();
    const session = data.sessions[key];

    if (session) {
      // Remove tokens but keep client info if present
      if (session.clientInfo) {
        data.sessions[key] = {
          tokens: { access_token: '', token_type: 'bearer' },
          clientInfo: session.clientInfo,
          createdAt: session.createdAt,
          updatedAt: Date.now(),
        };
      } else {
        // No client info, remove entire session
        const { [key]: _, ...remaining } = data.sessions;
        data.sessions = remaining;
      }
    }

    await this.writeFile(data);
  }

  async getClientInfo(serverUrl: string): Promise<ClientRegistration | null> {
    const key = this.normalizeUrl(serverUrl);
    const data = await this.readFile();

    return data.sessions[key]?.clientInfo ?? null;
  }

  async setClientInfo(serverUrl: string, info: ClientRegistration): Promise<void> {
    const key = this.normalizeUrl(serverUrl);
    const data = await this.readFile();
    const now = Date.now();

    const existing = data.sessions[key];
    data.sessions[key] = {
      tokens: existing?.tokens ?? { access_token: '', token_type: 'bearer' },
      clientInfo: info,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await this.writeFile(data);
  }

  async clearClientInfo(serverUrl: string): Promise<void> {
    const key = this.normalizeUrl(serverUrl);
    const data = await this.readFile();
    const session = data.sessions[key];

    if (session) {
      // Remove client info but keep tokens if present
      if (session.tokens?.access_token) {
        data.sessions[key] = {
          tokens: session.tokens,
          createdAt: session.createdAt,
          updatedAt: Date.now(),
        };
      } else {
        // No valid tokens, remove entire session
        const { [key]: _, ...remaining } = data.sessions;
        data.sessions = remaining;
      }
    }

    await this.writeFile(data);
  }

  async clearAll(): Promise<void> {
    await this.writeFile({ version: CURRENT_VERSION, sessions: {} });
  }

  async getAllSessions(): Promise<StoredSession[]> {
    const data = await this.readFile();

    return Object.entries(data.sessions).map(([url, session]) => ({
      serverUrl: url,
      tokens: session.tokens,
      clientInfo: session.clientInfo,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));
  }
}
