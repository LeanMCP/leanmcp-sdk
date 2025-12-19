/**
 * useTool - Enhanced hook for calling MCP tools
 * 
 * Features:
 * - Type-safe tool calls with generics
 * - Loading, success, and error states
 * - Retry support with configurable delay
 * - Abort support for cancelling in-flight calls
 * - Result transformation
 * - Callback hooks for all states
 * 
 * @example Basic usage
 * ```tsx
 * const { call, loading, result, error } = useTool<WeatherArgs, WeatherData>('get-weather');
 * 
 * const handleClick = async () => {
 *   const data = await call({ city: 'London' });
 *   console.log('Weather:', data);
 * };
 * ```
 * 
 * @example With options
 * ```tsx
 * const { call, loading, result, retry } = useTool('create-item', {
 *   defaultArgs: { type: 'note' },
 *   transform: (result) => result.structuredContent?.item,
 *   retry: { count: 3, delay: 1000 },
 *   onSuccess: (item) => toast.success(`Created: ${item.name}`),
 *   onError: (error) => toast.error(error.message),
 * });
 * ```
 */
import { useState, useCallback, useRef } from 'react';
import { useMcpApp } from './AppProvider';
import type {
    UseToolOptions,
    UseToolReturn,
    ToolState
} from '@/types/mcp-types';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Extract data from CallToolResult
 */
function extractResultData<T>(result: CallToolResult): T | null {
    // Handle structuredContent (preferred)
    if ('structuredContent' in result && result.structuredContent) {
        return result.structuredContent as T;
    }

    // Handle text content
    if (result.content && result.content.length > 0) {
        const textContent = result.content
            .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
            .map(c => c.text)
            .join('');

        if (textContent) {
            try {
                const parsed = JSON.parse(textContent);

                // Check if the parsed result has nested content structure
                // (common pattern: { content: [{ type: 'text', text: '...' }] })
                if (parsed && typeof parsed === 'object' && 'content' in parsed && Array.isArray(parsed.content)) {
                    // Recursively extract from nested content
                    const nested = extractResultData<T>(parsed as CallToolResult);
                    if (nested !== null) {
                        return nested;
                    }
                }

                return parsed as T;
            } catch {
                return textContent as T;
            }
        }
    }

    return result as T;
}

/**
 * useTool hook for calling MCP tools with full state management
 */
export function useTool<
    TArgs extends Record<string, unknown> = Record<string, unknown>,
    TResult = unknown
>(
    toolName: string,
    options: UseToolOptions<TArgs, TResult> = {}
): UseToolReturn<TArgs, TResult> {
    const { callTool } = useMcpApp();

    // State
    const [state, setState] = useState<ToolState>('idle');
    const [result, setResult] = useState<TResult | null>(null);
    const [error, setError] = useState<Error | null>(null);

    // Refs for cleanup and retry
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastArgsRef = useRef<TArgs | undefined>(undefined);
    const retryCountRef = useRef(0);

    const {
        defaultArgs,
        transform,
        retry,
        onStart,
        onSuccess,
        onError,
        onComplete,
    } = options;

    // Parse retry config
    const retryConfig = typeof retry === 'number'
        ? { count: retry, delay: 1000 }
        : retry ?? { count: 0, delay: 1000 };

    /**
     * Execute the tool call
     */
    const executeCall = useCallback(
        async (args?: TArgs): Promise<TResult> => {
            // Merge args with defaults
            const mergedArgs = { ...defaultArgs, ...args } as Record<string, unknown>;
            lastArgsRef.current = mergedArgs as TArgs;

            // Create abort controller
            abortControllerRef.current = new AbortController();

            // Update state
            setState('loading');
            setError(null);
            onStart?.();

            try {
                const response = await callTool(toolName, mergedArgs);

                // Check if aborted
                if (abortControllerRef.current?.signal.aborted) {
                    throw new Error('Tool call aborted');
                }

                // Transform result
                let data: TResult;
                if (transform) {
                    data = transform(response as CallToolResult);
                } else {
                    data = extractResultData<TResult>(response as CallToolResult) as TResult;
                }

                // Success state
                setState('success');
                setResult(data);
                retryCountRef.current = 0;
                onSuccess?.(data);
                onComplete?.();

                return data;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));

                // Retry logic
                if (retryCountRef.current < retryConfig.count) {
                    retryCountRef.current++;
                    await new Promise(resolve => setTimeout(resolve, retryConfig.delay));
                    return executeCall(args);
                }

                // Error state
                setState('error');
                setError(error);
                retryCountRef.current = 0;
                onError?.(error);
                onComplete?.();

                throw error;
            }
        },
        [callTool, toolName, defaultArgs, transform, retryConfig, onStart, onSuccess, onError, onComplete]
    );

    /**
     * Main call function
     */
    const call = useCallback(
        async (args?: TArgs): Promise<TResult> => {
            retryCountRef.current = 0;
            return executeCall(args);
        },
        [executeCall]
    );

    /**
     * Mutate function - same as call but more semantically correct for mutations
     */
    const mutate = useCallback(
        async (args: TArgs): Promise<TResult> => {
            return call(args);
        },
        [call]
    );

    /**
     * Reset to initial state
     */
    const reset = useCallback(() => {
        setState('idle');
        setResult(null);
        setError(null);
        retryCountRef.current = 0;
        abortControllerRef.current?.abort();
    }, []);

    /**
     * Retry last call
     */
    const retryCall = useCallback(async (): Promise<TResult | null> => {
        if (lastArgsRef.current === undefined && !defaultArgs) {
            return null;
        }
        retryCountRef.current = 0;
        return executeCall(lastArgsRef.current);
    }, [executeCall, defaultArgs]);

    /**
     * Abort current call
     */
    const abort = useCallback(() => {
        abortControllerRef.current?.abort();
        setState('idle');
    }, []);

    return {
        call,
        mutate,
        state,
        loading: state === 'loading',
        result,
        error,
        reset,
        retry: retryCall,
        abort,
    };
}

// Re-export types for convenience
export type { UseToolOptions, UseToolReturn, ToolState };
