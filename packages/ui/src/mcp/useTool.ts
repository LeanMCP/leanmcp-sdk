import { useState, useCallback } from 'react';
import { useMcpApp } from './AppProvider';

export interface UseToolResult<T = unknown> {
    /** Call the tool with arguments */
    call: (args?: Record<string, unknown>) => Promise<T>;
    /** Whether the tool is currently being called */
    loading: boolean;
    /** The result of the last tool call */
    result: T | null;
    /** Error from the last tool call */
    error: Error | null;
    /** Reset the result and error state */
    reset: () => void;
}

/**
 * Hook for calling an MCP tool with loading and error state
 * 
 * @example
 * ```tsx
 * function WeatherWidget() {
 *   const { call, loading, result, error } = useTool<WeatherData>('get-weather');
 *   
 *   return (
 *     <div>
 *       <button onClick={() => call({ city: 'London' })} disabled={loading}>
 *         {loading ? 'Loading...' : 'Get Weather'}
 *       </button>
 *       {result && <div>Temperature: {result.temperature}°C</div>}
 *       {error && <div>Error: {error.message}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTool<T = unknown>(toolName: string): UseToolResult<T> {
    const { callTool } = useMcpApp();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const call = useCallback(
        async (args: Record<string, unknown> = {}) => {
            setLoading(true);
            setError(null);
            try {
                const response = await callTool(toolName, args);
                const data = (response as { structuredContent?: T })?.structuredContent ?? response as T;
                setResult(data);
                return data;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [callTool, toolName]
    );

    const reset = useCallback(() => {
        setResult(null);
        setError(null);
    }, []);

    return { call, loading, result, error, reset };
}
