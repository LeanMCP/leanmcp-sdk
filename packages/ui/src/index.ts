/**
 * @leanmcp/ui - React UI components for MCP Apps
 * 
 * Build rich, interactive MCP Apps with components designed for ext-apps.
 * 
 * ## Decorator
 * - `@UIApp` decorator to link tools with UI components
 * 
 * ## Hooks (client-side)
 * - `useToolResult`, `useToolInput`, `useHostContext`, `useTool`
 * 
 * ## Components
 * - `Card`, `Button`, `Input`, `DataGrid`, `Chart`
 * 
 * @packageDocumentation
 */

// ===========================================
// Decorator for linking tools to UI components
// ===========================================
export { UIApp, getUIAppMetadata, getUIAppUri, type UIAppOptions } from './decorator';

// ===========================================
// Client-side: Context & Hooks (wrapping ext-apps)
// ===========================================
export { AppProvider, useMcpApp, type AppProviderProps, type McpAppContextValue, type AppInfo, type AppOptions } from './mcp/AppProvider';
export { useTool, type UseToolResult } from './mcp/useTool';
export { useToolResult, type UseToolResultReturn } from './mcp/useToolResult';
export { useToolInput, type UseToolInputReturn } from './mcp/useToolInput';
export { useToolInputPartial, type UseToolInputPartialReturn } from './mcp/useToolInputPartial';
export { useHostContext, type UseHostContextReturn } from './mcp/useHostContext';

// ===========================================
// MCP Components (for tool forms, actions)
// ===========================================
export { ActionButton, type ActionButtonProps } from './mcp/ActionButton';
export { ToolForm, type ToolFormProps, type ToolFormField } from './mcp/ToolForm';

// ===========================================
// Core UI Components
// ===========================================
export { Button, type ButtonProps } from './core/Button';
export { Card, CardHeader, CardContent, CardFooter, type CardProps, type CardHeaderProps, type CardContentProps, type CardFooterProps } from './core/Card';
export { Input, type InputProps } from './core/Input';

// ===========================================
// Data Visualization
// ===========================================
export { DataGrid, type DataGridProps, type DataGridColumn } from './data/DataGrid';
export { Chart, type ChartProps, type ChartType } from './data/Chart';

// ===========================================
// Layout
// ===========================================
export { AppShell, type AppShellProps } from './layout/AppShell';

// ===========================================
// Media
// ===========================================
export { CodeBlock, type CodeBlockProps } from './media/CodeBlock';

// ===========================================
// Re-export ext-apps types for convenience
// ===========================================
export type {
    App,
    McpUiHostContext,
    McpUiToolInputNotification,
    McpUiToolInputPartialNotification,
    McpUiToolResultNotification,
    McpUiAppCapabilities,
} from '@modelcontextprotocol/ext-apps';

