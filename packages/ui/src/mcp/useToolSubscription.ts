import { useEffect, useRef, useCallback, useState } from 'react';
import { useTool, type UseToolReturn } from './useTool';

export interface UseToolSubscriptionOptions {
    /** Polling interval in milliseconds */
    interval?: number;
    /** Whether to start polling immediately */
    enabled?: boolean;
    /** Arguments to pass to the tool */
    args?: Record<string, unknown>;
}

export interface UseToolSubscriptionResult<T = unknown> {
    /** Tool call result data */
    result: T | null;
    /** Loading state */
    loading: boolean;
    /** Error if any */
    error: Error | null;
    /** Start polling */
    start: () => void;
    /** Stop polling */
    stop: () => void;
    /** Whether polling is active */
    isPolling: boolean;
    /** Manually refresh (call tool immediately) */
    refresh: () => Promise<T>;
}

/**
 * Hook for subscribing to tool updates with automatic polling
 * 
 * @example
 * ```tsx
 * function StockTicker() {
 *   const { result, isPolling, start, stop } = useToolSubscription<StockData>(
 *     'get-stock-price',
 *     { interval: 5000, args: { symbol: 'AAPL' } }
 *   );
 *   
 *   return (
 *     <div>
 *       <div>Price: ${result?.price}</div>
 *       <button onClick={isPolling ? stop : start}>
 *         {isPolling ? 'Stop' : 'Start'} Updates
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useToolSubscription<T = unknown>(
    toolName: string,
    options: UseToolSubscriptionOptions = {}
): UseToolSubscriptionResult<T> {
    const { interval = 10000, enabled = true, args = {} } = options;
    const toolHook = useTool<Record<string, unknown>, T>(toolName);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    const stop = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsPolling(false);
    }, []);

    const start = useCallback(() => {
        // Defensive: ensure no existing interval before starting new one
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        setIsPolling(true);

        // Initial call
        toolHook.call(args).catch(() => { });

        // Start polling
        intervalRef.current = setInterval(() => {
            toolHook.call(args).catch(() => { });
        }, interval);
    }, [toolHook.call, args, interval]);

    const refresh = useCallback(async (): Promise<T> => {
        return toolHook.call(args);
    }, [toolHook.call, args]);

    // Auto-start if enabled
    useEffect(() => {
        if (enabled) {
            start();
        }
        return () => stop();
    }, [enabled, start, stop]);

    return {
        result: toolHook.result,
        loading: toolHook.loading,
        error: toolHook.error,
        start,
        stop,
        isPolling,
        refresh,
    };
}
