import { useEffect, useRef, useCallback } from 'react';
import { useTool, type UseToolResult } from './useTool';

export interface UseToolSubscriptionOptions {
    /** Polling interval in milliseconds */
    interval?: number;
    /** Whether to start polling immediately */
    enabled?: boolean;
    /** Arguments to pass to the tool */
    args?: Record<string, unknown>;
}

export interface UseToolSubscriptionResult<T = unknown> extends UseToolResult<T> {
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
    const toolHook = useTool<T>(toolName);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isPollingRef = useRef(false);

    const stop = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        isPollingRef.current = false;
    }, []);

    const start = useCallback(() => {
        stop();
        isPollingRef.current = true;

        // Initial call
        toolHook.call(args).catch(() => { });

        // Start polling
        intervalRef.current = setInterval(() => {
            toolHook.call(args).catch(() => { });
        }, interval);
    }, [toolHook.call, args, interval, stop]);

    const refresh = useCallback(async () => {
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
        ...toolHook,
        start,
        stop,
        isPolling: isPollingRef.current,
        refresh,
    };
}
