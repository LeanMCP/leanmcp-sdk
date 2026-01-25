/**
 * @leanmcp/ui - MCP-Native UI SDK for React
 *
 * Build rich, interactive MCP Apps with components designed for the
 * Model Context Protocol. Features first-class tool integration,
 * streaming support, and shadcn-style theming.
 *
 * ## Quick Start
 * ```tsx
 * import { AppProvider, ToolButton } from '@leanmcp/ui';
 *
 * function MyApp() {
 *   return (
 *     <AppProvider appInfo={{ name: 'MyApp', version: '1.0.0' }}>
 *       <ToolButton tool="refresh-data">Refresh</ToolButton>
 *     </AppProvider>
 *   );
 * }
 * ```
 *
 * ## Modules
 * - MCP Components - ToolButton, ToolSelect, ToolInput, ToolForm, etc.
 * - MCP Hooks - useTool, useResource, useMessage, useToolStream
 * - UI Components - shadcn-based Card, Button, Input, Alert, etc.
 * - Data Components - DataGrid, Chart
 *
 * @packageDocumentation
 */

// ===========================================
// Styles (must be imported by consumers)
// ===========================================
// import '@leanmcp/ui/styles.css'

// ===========================================
// MCP Context & Providers
// ===========================================
export { AppProvider, useMcpApp } from './mcp/AppProvider';
export type { AppProviderProps, McpAppContextValue, AppInfo, AppOptions } from './mcp/AppProvider';

// GPT-specific provider (uses ChatGPT's native window.openai SDK)
export { GPTAppProvider, useGptApp, useGptTool } from './mcp/GPTAppProvider';
export type { GptAppContextValue, GPTAppProviderProps } from './mcp/GPTAppProvider';

export { ToolProvider, useToolContext } from './mcp/ToolProvider';
export type { ToolProviderProps, ToolContextValue } from './mcp/ToolProvider';

// ===========================================
// Core UI Components (shadcn/ui)
// ===========================================
export { Toaster } from './components/ui/sonner';

// ===========================================
// MCP-Native Components
// ===========================================
export { ToolButton } from './mcp/ToolButton';
export type { ToolButtonProps, ToolButtonState } from './mcp/ToolButton';

export { ToolSelect } from './mcp/ToolSelect';
export type { ToolSelectProps, ToolSelectOption } from './mcp/ToolSelect';

export { ToolInput } from './mcp/ToolInput';
export type { ToolInputProps, ToolInputSuggestion } from './mcp/ToolInput';

export { ToolForm } from './mcp/ToolForm';
export type { ToolFormProps, ToolFormField } from './mcp/ToolForm';

export { ResourceView } from './mcp/ResourceView';
export type { ResourceViewProps, ResourceMeta } from './mcp/ResourceView';

export { StreamingContent } from './mcp/StreamingContent';
export type { StreamingContentProps } from './mcp/StreamingContent';

export { ToolDataGrid } from './mcp/ToolDataGrid';
export type {
  ToolDataGridProps,
  ToolDataGridColumn,
  ToolDataGridRowAction,
} from './mcp/ToolDataGrid';

// Legacy ActionButton (prefer ToolButton for new code)
export { ActionButton } from './mcp/ActionButton';
export type { ActionButtonProps } from './mcp/ActionButton';

// ===========================================
// MCP Utility Components
// ===========================================
export { RequireConnection } from './mcp/RequireConnection';
export type { RequireConnectionProps } from './mcp/RequireConnection';

export { ToolErrorBoundary } from './mcp/ToolErrorBoundary';
export type { ToolErrorBoundaryProps } from './mcp/ToolErrorBoundary';

// ===========================================
// MCP Hooks
// ===========================================
export { useTool } from './mcp/useTool';
export type { UseToolOptions, UseToolReturn, ToolState } from './mcp/useTool';

export { useToolStream } from './mcp/useToolStream';
export type { UseToolStreamOptions, UseToolStreamReturn } from './mcp/useToolStream';

export { useResource } from './mcp/useResource';
export type { UseResourceOptions, UseResourceReturn } from './mcp/useResource';

export { useMessage } from './mcp/useMessage';
export type { UseMessageReturn } from './mcp/useMessage';

export { useHostContext, type UseHostContextReturn } from './mcp/useHostContext';
export { useToolResult, type UseToolResultReturn } from './mcp/useToolResult';
export { useToolInput, type UseToolInputReturn } from './mcp/useToolInput';
export { useToolInputPartial, type UseToolInputPartialReturn } from './mcp/useToolInputPartial';
export { useToolSubscription } from './mcp/useToolSubscription';
export { useAuth, type UseAuthReturn, type AuthUser } from './mcp/useAuth';

// Spec-compliant hooks
export { useOpenAiGlobal } from './mcp/useOpenAiGlobal';
export {
  useToolOutput,
  useToolResponseMetadata,
  useToolInput as useToolInputSpec,
} from './mcp/useToolData';
export { useWidgetState } from './mcp/useWidgetState';

// ===========================================
// MCP Types
// ===========================================
export type {
  ToolBinding,
  McpActionProps,
  ToolResultConfig,
  ConfirmConfig,
  ResourceBinding,
  ToolCallState,
} from './types/mcp-types';
export { normalizeToolBinding, INITIAL_TOOL_STATE, DEFAULT_RESULT_CONFIG } from './types/mcp-types';

// ===========================================
// shadcn UI Components
// ===========================================
export * from './components/ui';

// ===========================================
// Utilities
// ===========================================
export { cn } from './lib/utils';

// ===========================================
// Decorator for Server-side UI binding
// ===========================================
export { UIApp, getUIAppMetadata, getUIAppUri, type UIAppOptions } from './decorator';
export { GPTApp, getGPTAppMetadata, getGPTAppUri, type GPTAppOptions } from './decorator';

// ===========================================
// Data Visualization Components
// ===========================================
export { DataGrid, type DataGridProps, type DataGridColumn } from './data/DataGrid';
export { Chart, type ChartProps, type ChartType } from './data/Chart';

// ===========================================
// Layout Components
// ===========================================
export { AppShell, type AppShellProps } from './layout/AppShell';
export {
  Tabs,
  TabContent,
  type TabsProps,
  type TabContentProps,
  type TabItem,
} from './layout/Tabs';
export { Modal, type ModalProps } from './layout/Modal';

// ===========================================
// Media Components
// ===========================================
export { CodeBlock, type CodeBlockProps } from './media/CodeBlock';

// ===========================================
// Core UI Components (legacy components for backwards compatibility)
// Use shadcn components from './components/ui' for new code
// ===========================================
export { Button, type ButtonProps } from './core/Button';
export { Card, CardHeader, CardContent, CardFooter } from './core/Card';
export type { CardProps, CardHeaderProps, CardContentProps, CardFooterProps } from './core/Card';
export { Input, type InputProps } from './core/Input';

// ===========================================
// Re-export ext-apps types for convenience
// ===========================================
export { App, PostMessageTransport } from '@modelcontextprotocol/ext-apps';
export { AppBridge } from '@modelcontextprotocol/ext-apps/app-bridge';

// Style utility functions
export {
  applyHostStyleVariables,
  applyDocumentTheme,
  applyHostFonts,
  getDocumentTheme,
} from '@modelcontextprotocol/ext-apps';

// Constants for server-side integration
export { RESOURCE_URI_META_KEY, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps';

export type {
  McpUiHostContext,
  McpUiToolInputNotification,
  McpUiToolInputPartialNotification,
  McpUiToolResultNotification,
  McpUiToolCancelledNotification,
  McpUiAppCapabilities,
  McpUiDisplayMode,
  McpUiStyles,
  McpUiHostStyles,
  // New types in ext-apps 0.2.2
  McpUiToolMeta,
  McpUiToolVisibility,
  McpUiResourceMeta,
  McpUiResourceCsp,
  McpUiTheme,
  McpUiHostCss,
} from '@modelcontextprotocol/ext-apps';
