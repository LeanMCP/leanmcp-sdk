/**
 * @leanmcp/ui/testing - Testing utilities
 *
 * Provides MockAppProvider for unit testing MCP App components.
 */
import React, { type ReactNode, useEffect } from 'react';
import type { McpUiHostContext, McpUiDisplayMode } from '@modelcontextprotocol/ext-apps';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { McpAppContext, type McpAppContextValue } from './mcp/AppProvider';

/**
 * Props for MockAppProvider
 */
export interface MockAppProviderProps {
  /** Mocked tool result */
  toolResult?: CallToolResult | Record<string, unknown> | null;
  /** Mocked tool input */
  toolInput?: Record<string, unknown> | null;
  /** Mocked partial tool input */
  toolInputPartial?: Record<string, unknown> | null;
  /** Mocked host context */
  hostContext?: Partial<McpUiHostContext>;
  /** Whether to simulate connected state */
  isConnected?: boolean;
  /** Mock callTool function */
  callTool?: (name: string, args?: Record<string, unknown>) => Promise<CallToolResult>;
  /** Mock tool cancelled state */
  toolCancelled?: { cancelled: boolean; reason?: string };
  /** Children */
  children: ReactNode;
}

/**
 * MockAppProvider - For testing MCP App components
 *
 * Uses the same McpAppContext as AppProvider, so hooks like
 * useToolResult() and useTool() work correctly in tests.
 *
 * Note: Does NOT wrap children in a themed container. Theme
 * should be provided by an outer wrapper (e.g., the showcase App).
 *
 * @example
 * ```tsx
 * import { MockAppProvider } from '@leanmcp/ui/testing';
 * import { render, screen } from '@testing-library/react';
 *
 * test('WeatherCard displays temperature', () => {
 *   render(
 *     <MockAppProvider toolResult={{ city: 'London', temperature: 20 }}>
 *       <WeatherCard />
 *     </MockAppProvider>
 *   );
 *   expect(screen.getByText('20°C')).toBeInTheDocument();
 * });
 * ```
 */
export function MockAppProvider({
  toolResult = null,
  toolInput = null,
  toolInputPartial = null,
  hostContext = {},
  isConnected = true,
  callTool,
  toolCancelled = { cancelled: false },
  children,
}: MockAppProviderProps) {
  // Convert plain object to CallToolResult format if needed
  const normalizedResult: CallToolResult | null = toolResult
    ? 'content' in toolResult
      ? (toolResult as CallToolResult)
      : ({
          content: [{ type: 'text', text: JSON.stringify(toolResult) }],
        } as CallToolResult)
    : null;

  const mockCallTool =
    callTool ??
    (async (_name: string, _args?: Record<string, unknown>) =>
      ({
        content: [{ type: 'text' as const, text: '{}' }],
      }) as CallToolResult);

  const mockRequestDisplayMode = async (mode: McpUiDisplayMode): Promise<McpUiDisplayMode> => {
    return mode;
  };

  const value: McpAppContextValue = {
    app: null,
    isConnected,
    error: null,
    hostContext: { theme: 'light', ...hostContext },
    toolInput,
    toolInputPartial,
    toolResult: normalizedResult,
    toolCancelled,
    callTool: mockCallTool,
    sendMessage: async () => {},
    sendLog: async () => {},
    openLink: async () => {},
    requestDisplayMode: mockRequestDisplayMode,
  };

  const theme = hostContext.theme ?? 'light';

  // Sync theme to body for Portals
  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  return React.createElement(
    McpAppContext.Provider,
    { value },
    React.createElement('div', { className: 'lui-root', 'data-theme': theme }, children)
  );
}
