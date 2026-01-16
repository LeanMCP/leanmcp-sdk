/**
 * Background Token Refresh Manager
 * 
 * Automatically refreshes tokens before they expire, ensuring
 * uninterrupted access without user-visible authentication prompts.
 */

import type { OAuthTokens, TokenStorage } from '../storage/types';
import { isTokenExpired, withExpiresAt } from '../storage/types';

/**
 * Token refresh callback
 */
export type RefreshCallback = (refreshToken: string) => Promise<OAuthTokens>;

/**
 * Refresh event types
 */
export type RefreshEvent =
    | { type: 'refresh_started'; serverUrl: string }
    | { type: 'refresh_success'; serverUrl: string; tokens: OAuthTokens }
    | { type: 'refresh_failed'; serverUrl: string; error: Error }
    | { type: 'token_expired'; serverUrl: string };

/**
 * Event listener callback
 */
export type RefreshEventListener = (event: RefreshEvent) => void;

/**
 * Refresh manager options
 */
export interface RefreshManagerOptions {
    /** Token storage backend */
    storage: TokenStorage;

    /** Function to refresh tokens */
    refreshFn: RefreshCallback;

    /** Server URL this manager is for */
    serverUrl: string;

    /** Seconds before expiry to trigger refresh (default: 300 = 5 minutes) */
    refreshBuffer?: number;

    /** Check interval in ms (default: 60000 = 1 minute) */
    checkInterval?: number;

    /** Maximum retry attempts on failure (default: 3) */
    maxRetries?: number;

    /** Retry delay in ms (default: 5000) */
    retryDelay?: number;
}

/**
 * Background Token Refresh Manager
 * 
 * Monitors token expiry and automatically refreshes before expiration.
 * 
 * @example
 * ```typescript
 * const manager = new RefreshManager({
 *   storage,
 *   serverUrl: 'https://mcp.example.com',
 *   refreshFn: async (refreshToken) => {
 *     // Call token endpoint with refresh_token grant
 *     return await exchangeRefreshToken(refreshToken);
 *   },
 * });
 * 
 * manager.on((event) => {
 *   if (event.type === 'refresh_failed') {
 *     console.error('Token refresh failed:', event.error);
 *   }
 * });
 * 
 * manager.start();
 * 
 * // Later...
 * manager.stop();
 * ```
 */
export class RefreshManager {
    private storage: TokenStorage;
    private refreshFn: RefreshCallback;
    private serverUrl: string;
    private refreshBuffer: number;
    private checkInterval: number;
    private maxRetries: number;
    private retryDelay: number;

    private intervalId?: NodeJS.Timeout;
    private pendingRefresh?: Promise<OAuthTokens>;
    private retryCount = 0;
    private listeners: RefreshEventListener[] = [];
    private isRunning = false;

    constructor(options: RefreshManagerOptions) {
        this.storage = options.storage;
        this.refreshFn = options.refreshFn;
        this.serverUrl = options.serverUrl;
        this.refreshBuffer = options.refreshBuffer ?? 300; // 5 minutes
        this.checkInterval = options.checkInterval ?? 60000; // 1 minute
        this.maxRetries = options.maxRetries ?? 3;
        this.retryDelay = options.retryDelay ?? 5000;
    }

    /**
     * Start background refresh monitoring
     */
    start(): void {
        if (this.isRunning) return;

        this.isRunning = true;

        // Check immediately
        this.checkAndRefresh();

        // Then check periodically
        this.intervalId = setInterval(() => {
            this.checkAndRefresh();
        }, this.checkInterval);
    }

    /**
     * Stop background refresh monitoring
     */
    stop(): void {
        this.isRunning = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
    }

    /**
     * Register event listener
     */
    on(listener: RefreshEventListener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Emit event to all listeners
     */
    private emit(event: RefreshEvent): void {
        for (const listener of this.listeners) {
            try {
                listener(event);
            } catch {
                // Ignore listener errors
            }
        }
    }

    /**
     * Check token and refresh if needed
     */
    private async checkAndRefresh(): Promise<void> {
        // Skip if already refreshing
        if (this.pendingRefresh) return;

        try {
            const tokens = await this.storage.getTokens(this.serverUrl);

            if (!tokens) return;

            // Check if token needs refresh
            if (!isTokenExpired(tokens, this.refreshBuffer)) {
                // Token still valid, reset retry count
                this.retryCount = 0;
                return;
            }

            // Check if refresh token is available
            if (!tokens.refresh_token) {
                this.emit({ type: 'token_expired', serverUrl: this.serverUrl });
                return;
            }

            // Perform refresh
            await this.performRefresh(tokens.refresh_token);

        } catch (error) {
            console.error('[RefreshManager] Error checking tokens:', error);
        }
    }

    /**
     * Perform token refresh with retry logic
     */
    private async performRefresh(refreshToken: string): Promise<void> {
        this.emit({ type: 'refresh_started', serverUrl: this.serverUrl });

        this.pendingRefresh = this.doRefresh(refreshToken);

        try {
            const tokens = await this.pendingRefresh;
            this.retryCount = 0;
            this.emit({ type: 'refresh_success', serverUrl: this.serverUrl, tokens });
        } catch (error) {
            this.emit({
                type: 'refresh_failed',
                serverUrl: this.serverUrl,
                error: error instanceof Error ? error : new Error(String(error)),
            });

            // Retry logic
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                setTimeout(() => {
                    this.checkAndRefresh();
                }, this.retryDelay * this.retryCount); // Exponential backoff
            }
        } finally {
            this.pendingRefresh = undefined;
        }
    }

    /**
     * Actually perform the refresh
     */
    private async doRefresh(refreshToken: string): Promise<OAuthTokens> {
        const newTokens = await this.refreshFn(refreshToken);
        const enrichedTokens = withExpiresAt(newTokens);

        // Preserve refresh token if not returned
        if (!enrichedTokens.refresh_token) {
            enrichedTokens.refresh_token = refreshToken;
        }

        await this.storage.setTokens(this.serverUrl, enrichedTokens);

        return enrichedTokens;
    }

    /**
     * Force an immediate refresh
     */
    async forceRefresh(): Promise<OAuthTokens> {
        const tokens = await this.storage.getTokens(this.serverUrl);

        if (!tokens?.refresh_token) {
            throw new Error('No refresh token available');
        }

        // Wait for pending refresh if any
        if (this.pendingRefresh) {
            return this.pendingRefresh;
        }

        this.pendingRefresh = this.doRefresh(tokens.refresh_token);

        try {
            const newTokens = await this.pendingRefresh;
            this.emit({ type: 'refresh_success', serverUrl: this.serverUrl, tokens: newTokens });
            return newTokens;
        } finally {
            this.pendingRefresh = undefined;
        }
    }

    /**
     * Get current running state
     */
    get running(): boolean {
        return this.isRunning;
    }
}

/**
 * Create a simple refresh manager for an OAuth client
 */
export function createRefreshManager(
    storage: TokenStorage,
    serverUrl: string,
    tokenEndpoint: string,
    clientId: string,
    clientSecret?: string
): RefreshManager {
    return new RefreshManager({
        storage,
        serverUrl,
        refreshFn: async (refreshToken: string) => {
            const payload: Record<string, string> = {
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: clientId,
            };

            if (clientSecret) {
                payload.client_secret = clientSecret;
            }

            const response = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(payload),
            });

            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.status}`);
            }

            return response.json();
        },
    });
}
