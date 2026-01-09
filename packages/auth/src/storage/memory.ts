/**
 * In-memory token storage
 * 
 * Fast, simple storage for development and short-lived sessions.
 * Tokens are lost when the process exits.
 */

import type {
    TokenStorage,
    OAuthTokens,
    ClientRegistration,
    StoredSession
} from './types';
import { withExpiresAt } from './types';

interface MemoryEntry<T> {
    value: T;
    expiresAt?: number;
}

/**
 * In-memory token storage implementation
 * 
 * @example
 * ```typescript
 * const storage = new MemoryStorage();
 * await storage.setTokens('https://mcp.example.com', tokens);
 * ```
 */
export class MemoryStorage implements TokenStorage {
    private tokens = new Map<string, MemoryEntry<OAuthTokens>>();
    private clients = new Map<string, MemoryEntry<ClientRegistration>>();

    /**
     * Normalize server URL for consistent key lookup
     */
    private normalizeUrl(serverUrl: string): string {
        return serverUrl.replace(/\/+$/, '').toLowerCase();
    }

    /**
     * Check if an entry is expired
     */
    private isExpired<T>(entry: MemoryEntry<T> | undefined): boolean {
        if (!entry) return true;
        if (!entry.expiresAt) return false;
        return Date.now() / 1000 >= entry.expiresAt;
    }

    async getTokens(serverUrl: string): Promise<OAuthTokens | null> {
        const key = this.normalizeUrl(serverUrl);
        const entry = this.tokens.get(key);

        if (this.isExpired(entry)) {
            this.tokens.delete(key);
            return null;
        }

        return entry?.value ?? null;
    }

    async setTokens(serverUrl: string, tokens: OAuthTokens): Promise<void> {
        const key = this.normalizeUrl(serverUrl);
        const enrichedTokens = withExpiresAt(tokens);

        this.tokens.set(key, {
            value: enrichedTokens,
            expiresAt: enrichedTokens.expires_at,
        });
    }

    async clearTokens(serverUrl: string): Promise<void> {
        const key = this.normalizeUrl(serverUrl);
        this.tokens.delete(key);
    }

    async getClientInfo(serverUrl: string): Promise<ClientRegistration | null> {
        const key = this.normalizeUrl(serverUrl);
        const entry = this.clients.get(key);

        if (this.isExpired(entry)) {
            this.clients.delete(key);
            return null;
        }

        return entry?.value ?? null;
    }

    async setClientInfo(serverUrl: string, info: ClientRegistration): Promise<void> {
        const key = this.normalizeUrl(serverUrl);

        this.clients.set(key, {
            value: info,
            expiresAt: info.client_secret_expires_at,
        });
    }

    async clearClientInfo(serverUrl: string): Promise<void> {
        const key = this.normalizeUrl(serverUrl);
        this.clients.delete(key);
    }

    async clearAll(): Promise<void> {
        this.tokens.clear();
        this.clients.clear();
    }

    async getAllSessions(): Promise<StoredSession[]> {
        const sessions: StoredSession[] = [];

        for (const [url, entry] of this.tokens.entries()) {
            if (!this.isExpired(entry)) {
                sessions.push({
                    serverUrl: url,
                    tokens: entry.value,
                    clientInfo: this.clients.get(url)?.value,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            }
        }

        return sessions;
    }
}
