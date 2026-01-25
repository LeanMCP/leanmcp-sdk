/**
 * useToolResult - Access the tool result from the host
 *
 * Returns the result of the tool call that spawned this MCP App.
 * The host sends this via ui/notifications/tool-result after tool execution.
 */
import { useMcpApp } from './AppProvider';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface UseToolResultReturn<T = unknown> {
  /** The tool result, typed as T */
  result: T | null;
  /** Raw CallToolResult from MCP */
  rawResult: CallToolResult | null;
  /** Whether a result has been received */
  hasResult: boolean;
  /** Extract text content from result */
  textContent: string | null;
}

/**
 * Hook to access tool result from host
 *
 * @example
 * ```tsx
 * function WeatherCard() {
 *   const { result } = useToolResult<{ city: string; temp: number }>();
 *
 *   if (!result) return <div>Loading...</div>;
 *
 *   return <div>{result.city}: {result.temp}°C</div>;
 * }
 * ```
 */
export function useToolResult<T = unknown>(): UseToolResultReturn<T> {
  const { toolResult } = useMcpApp();

  // Extract structured content if available
  let result: T | null = null;
  let textContent: string | null = null;

  if (toolResult) {
    // Try structuredContent first (MCP 2024-11-05+)
    if ('structuredContent' in toolResult && toolResult.structuredContent) {
      result = toolResult.structuredContent as T;
    }

    // Fall back to parsing text content as JSON
    if (!result && toolResult.content) {
      const textItem = toolResult.content.find(
        (c): c is { type: 'text'; text: string } => c.type === 'text'
      );
      if (textItem) {
        textContent = textItem.text;
        try {
          result = JSON.parse(textItem.text) as T;
        } catch {
          // Not JSON, leave as null
        }
      }
    }
  }

  return {
    result,
    rawResult: toolResult,
    hasResult: toolResult !== null,
    textContent,
  };
}
