/**
 * OS Keychain Token Storage
 *
 * Secure storage using the operating system's credential manager:
 * - macOS: Keychain
 * - Windows: Credential Vault
 * - Linux: libsecret (GNOME Keyring, KWallet, etc.)
 *
 * Requires the optional 'keytar' peer dependency.
 */

import type { TokenStorage, OAuthTokens, ClientRegistration, StoredSession } from './types';
import { withExpiresAt } from './types';

const SERVICE_NAME = 'leanmcp-auth';

/**
 * Keytar module type (optional dependency)
 */
interface KeytarModule {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
  findCredentials(service: string): Promise<Array<{ account: string; password: string }>>;
}

/**
 * Keychain storage options
 */
export interface KeychainStorageOptions {
  /** Custom service name (default: 'leanmcp-auth') */
  serviceName?: string;
}

/**
 * OS Keychain-based token storage
 *
 * Uses the operating system's secure credential storage for maximum security.
 * Tokens are encrypted at rest by the OS.
 *
 * @example
 * ```typescript
 * import { KeychainStorage } from '@leanmcp/auth/storage';
 *
 * // Requires 'keytar' to be installed
 * const storage = new KeychainStorage();
 *
 * await storage.setTokens('https://mcp.example.com', tokens);
 * ```
 */
export class KeychainStorage implements TokenStorage {
  private serviceName: string;
  private keytar: KeytarModule | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(options: KeychainStorageOptions = {}) {
    this.serviceName = options.serviceName ?? SERVICE_NAME;
  }

  /**
   * Initialize keytar (lazy load)
   */
  private async init(): Promise<void> {
    if (this.keytar) return;

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      try {
        // Dynamic require to avoid bundling keytar in environments that don't need it
        this.keytar = require('keytar') as KeytarModule;
      } catch (error) {
        throw new Error(
          'KeychainStorage requires the "keytar" package. Install it with: npm install keytar'
        );
      }
    })();

    await this.initPromise;
  }

  /**
   * Normalize server URL for consistent key lookup
   */
  private normalizeUrl(serverUrl: string): string {
    return serverUrl.replace(/\/+$/, '').toLowerCase();
  }

  /**
   * Get account key for tokens
   */
  private getTokensAccount(serverUrl: string): string {
    return `tokens:${this.normalizeUrl(serverUrl)}`;
  }

  /**
   * Get account key for client info
   */
  private getClientAccount(serverUrl: string): string {
    return `client:${this.normalizeUrl(serverUrl)}`;
  }

  async getTokens(serverUrl: string): Promise<OAuthTokens | null> {
    await this.init();

    const account = this.getTokensAccount(serverUrl);
    const stored = await this.keytar!.getPassword(this.serviceName, account);

    if (!stored) return null;

    try {
      return JSON.parse(stored) as OAuthTokens;
    } catch {
      return null;
    }
  }

  async setTokens(serverUrl: string, tokens: OAuthTokens): Promise<void> {
    await this.init();

    const account = this.getTokensAccount(serverUrl);
    const enrichedTokens = withExpiresAt(tokens);

    await this.keytar!.setPassword(this.serviceName, account, JSON.stringify(enrichedTokens));
  }

  async clearTokens(serverUrl: string): Promise<void> {
    await this.init();

    const account = this.getTokensAccount(serverUrl);
    await this.keytar!.deletePassword(this.serviceName, account);
  }

  async getClientInfo(serverUrl: string): Promise<ClientRegistration | null> {
    await this.init();

    const account = this.getClientAccount(serverUrl);
    const stored = await this.keytar!.getPassword(this.serviceName, account);

    if (!stored) return null;

    try {
      return JSON.parse(stored) as ClientRegistration;
    } catch {
      return null;
    }
  }

  async setClientInfo(serverUrl: string, info: ClientRegistration): Promise<void> {
    await this.init();

    const account = this.getClientAccount(serverUrl);
    await this.keytar!.setPassword(this.serviceName, account, JSON.stringify(info));
  }

  async clearClientInfo(serverUrl: string): Promise<void> {
    await this.init();

    const account = this.getClientAccount(serverUrl);
    await this.keytar!.deletePassword(this.serviceName, account);
  }

  async clearAll(): Promise<void> {
    await this.init();

    const credentials = await this.keytar!.findCredentials(this.serviceName);

    for (const cred of credentials) {
      await this.keytar!.deletePassword(this.serviceName, cred.account);
    }
  }

  async getAllSessions(): Promise<StoredSession[]> {
    await this.init();

    const credentials = await this.keytar!.findCredentials(this.serviceName);
    const sessions: StoredSession[] = [];
    const tokensMap = new Map<string, OAuthTokens>();
    const clientMap = new Map<string, ClientRegistration>();

    // Parse all credentials
    for (const cred of credentials) {
      if (cred.account.startsWith('tokens:')) {
        const url = cred.account.replace('tokens:', '');
        try {
          tokensMap.set(url, JSON.parse(cred.password));
        } catch {
          // Ignore invalid entries
        }
      } else if (cred.account.startsWith('client:')) {
        const url = cred.account.replace('client:', '');
        try {
          clientMap.set(url, JSON.parse(cred.password));
        } catch {
          // Ignore invalid entries
        }
      }
    }

    // Combine into sessions
    for (const [url, tokens] of tokensMap) {
      sessions.push({
        serverUrl: url,
        tokens,
        clientInfo: clientMap.get(url),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return sessions;
  }
}

/**
 * Check if keychain storage is available
 */
export async function isKeychainAvailable(): Promise<boolean> {
  try {
    require('keytar');
    return true;
  } catch {
    return false;
  }
}
