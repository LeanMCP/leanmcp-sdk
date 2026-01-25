/**
 * @leanmcp/ui/hooks - MCP App hooks
 *
 * Lightweight entry point for hooks only.
 * Import components separately from @leanmcp/ui/components.
 */

// AppProvider and context
export {
  AppProvider,
  useMcpApp,
  type AppProviderProps,
  type McpAppContextValue,
  type AppInfo,
  type AppOptions,
} from './mcp/AppProvider';

// Higher-level convenience hooks
export { useTool, type UseToolReturn } from './mcp/useTool';
export { useToolResult, type UseToolResultReturn } from './mcp/useToolResult';
export { useToolInput, type UseToolInputReturn } from './mcp/useToolInput';
export { useToolInputPartial, type UseToolInputPartialReturn } from './mcp/useToolInputPartial';
export { useHostContext, type UseHostContextReturn } from './mcp/useHostContext';

// Re-export ext-apps types from main package (not /react subpath)
export type {
  App,
  McpUiHostContext,
  McpUiToolInputNotification,
  McpUiToolInputPartialNotification,
  McpUiToolResultNotification,
  McpUiAppCapabilities,
} from '@modelcontextprotocol/ext-apps';
