/**
 * useToolStream - Hook for handling streaming/partial tool input
 *
 * MCP Apps receive tool input progressively as the host streams it.
 * This hook provides access to both partial (streaming) and complete data.
 *
 * @example
 * ```tsx
 * function StreamingWeather() {
 *   const { partial, complete, isStreaming, isComplete } = useToolStream<WeatherData>();
 *
 *   if (isStreaming && partial) {
 *     return <WeatherSkeleton data={partial} />;
 *   }
 *
 *   if (isComplete && complete) {
 *     return <WeatherDisplay data={complete} />;
 *   }
 *
 *   return <LoadingSpinner />;
 * }
 * ```
 */
import { useState, useEffect, useCallback } from 'react';
import { useMcpApp } from './AppProvider';
import type { UseToolStreamOptions, UseToolStreamReturn } from '@/types/mcp-types';

/**
 * Hook for receiving streaming/partial tool input from the host
 */
export function useToolStream<T = unknown>(
  options: UseToolStreamOptions<T> = {}
): UseToolStreamReturn<T> {
  const { toolInputPartial, toolInput, toolResult } = useMcpApp();
  const { onPartial, onComplete } = options;

  const [partial, setPartial] = useState<Partial<T> | null>(null);
  const [complete, setComplete] = useState<T | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Handle partial input updates
  useEffect(() => {
    if (toolInputPartial) {
      setPartial(toolInputPartial as Partial<T>);
      setIsStreaming(true);
      setIsComplete(false);
      onPartial?.(toolInputPartial as Partial<T>);
    }
  }, [toolInputPartial, onPartial]);

  // Handle complete input
  useEffect(() => {
    if (toolInput) {
      setComplete(toolInput as T);
      setIsStreaming(false);
      setIsComplete(true);
      onComplete?.(toolInput as T);
    }
  }, [toolInput, onComplete]);

  // Also treat toolResult as completion
  useEffect(() => {
    if (toolResult && !toolResult.isError) {
      setIsStreaming(false);
      setIsComplete(true);
    }
  }, [toolResult]);

  return {
    partial,
    complete,
    isStreaming,
    isComplete,
  };
}

// Re-export types
export type { UseToolStreamOptions, UseToolStreamReturn };
