/**
 * useResource - Hook for reading MCP server resources
 * 
 * Provides access to MCP resources with auto-refresh and subscription support.
 * Resources are identified by URIs and can contain any type of data.
 * 
 * @example Basic usage
 * ```tsx
 * function UserProfile() {
 *   const { data, loading, error, refresh } = useResource<User>('user://profile');
 *   
 *   if (loading) return <Skeleton />;
 *   if (error) return <Error message={error.message} />;
 *   
 *   return (
 *     <Card>
 *       <h2>{data?.name}</h2>
 *       <Button onClick={refresh}>Refresh</Button>
 *     </Card>
 *   );
 * }
 * ```
 * 
 * @example With auto-refresh
 * ```tsx
 * // Refresh every 5 seconds
 * const { data } = useResource('metrics://dashboard', {
 *   refreshInterval: 5000,
 *   transform: (raw) => raw.metrics,
 * });
 * ```
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useMcpApp } from './AppProvider';
import type { UseResourceOptions, UseResourceReturn } from '@/types/mcp-types';

/**
 * Hook for reading and managing MCP server resources
 */
export function useResource<T = unknown>(
    uri: string,
    options: UseResourceOptions<T> = {}
): UseResourceReturn<T> {
    const { app, isConnected } = useMcpApp();

    const {
        refreshInterval,
        subscribe = false,
        transform,
        skip = false,
    } = options;

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(!skip);
    const [error, setError] = useState<Error | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);

    /**
     * Fetch the resource
     */
    const fetchResource = useCallback(async (): Promise<T> => {
        if (!app || !isConnected) {
            throw new Error('Not connected to MCP host');
        }

        setLoading(true);
        setError(null);

        try {
            // Note: readResource is not available on the base App class
            // This would need to be added or we use a custom implementation
            // For now, we'll simulate with a placeholder that can be extended

            // In a real implementation, this would be:
            // const result = await app.readResource({ uri });

            // Placeholder implementation - extend AppProvider to support resources
            const result = await (app as unknown as { readResource?: (params: { uri: string }) => Promise<{ contents: unknown[] }> })
                .readResource?.({ uri });

            if (!result) {
                throw new Error('readResource not supported by host');
            }

            // Extract data from resource contents
            let resourceData: T;
            if (result.contents && result.contents.length > 0) {
                const content = result.contents[0] as { text?: string; blob?: string };
                if (content.text) {
                    try {
                        resourceData = JSON.parse(content.text) as T;
                    } catch {
                        resourceData = content.text as T;
                    }
                } else if (content.blob) {
                    resourceData = content.blob as T;
                } else {
                    resourceData = content as T;
                }
            } else {
                resourceData = result as T;
            }

            // Apply transform
            if (transform) {
                resourceData = transform(resourceData);
            }

            if (mountedRef.current) {
                setData(resourceData);
                setLastUpdated(new Date());
                setLoading(false);
            }

            return resourceData;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (mountedRef.current) {
                setError(error);
                setLoading(false);
            }
            throw error;
        }
    }, [app, isConnected, uri, transform]);

    /**
     * Manual refresh function
     */
    const refresh = useCallback(async (): Promise<T> => {
        return fetchResource();
    }, [fetchResource]);

    // Initial fetch
    useEffect(() => {
        mountedRef.current = true;

        if (!skip && isConnected) {
            fetchResource().catch(() => {
                // Error is already set in state
            });
        }

        return () => {
            mountedRef.current = false;
        };
    }, [uri, isConnected, skip, fetchResource]);

    // Auto-refresh interval
    useEffect(() => {
        // Cleanup ANY existing interval first (defensive)
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (refreshInterval && refreshInterval > 0 && isConnected && !skip) {
            intervalRef.current = setInterval(() => {
                fetchResource().catch(() => {
                    // Error is already set in state
                });
            }, refreshInterval);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [refreshInterval, isConnected, skip, fetchResource]);

    // TODO: Implement subscription support when ext-apps supports it
    useEffect(() => {
        if (subscribe) {
            console.warn('[useResource] Subscription support not yet implemented');
        }
    }, [subscribe]);

    return {
        data,
        loading,
        error,
        refresh,
        lastUpdated,
    };
}

// Re-export types
export type { UseResourceOptions, UseResourceReturn };
