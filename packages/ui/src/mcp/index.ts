/**
 * @leanmcp/ui/mcp - MCP-Native Components and Hooks
 *
 * This module exports all MCP-specific components and hooks that integrate
 * with the Model Context Protocol for building interactive MCP Apps.
 */

// ============================================================================
// Context Providers
// ============================================================================

export { AppProvider, useMcpApp } from './AppProvider';
export type { AppProviderProps, McpAppContextValue, AppInfo, AppOptions } from './AppProvider';

export { ToolProvider, useToolContext } from './ToolProvider';
export type { ToolProviderProps, ToolContextValue } from './ToolProvider';

// ============================================================================
// MCP-Native Components
// ============================================================================

export { ToolButton } from './ToolButton';
export type { ToolButtonProps, ToolButtonState } from './ToolButton';

export { ToolSelect } from './ToolSelect';
export type { ToolSelectProps, ToolSelectOption } from './ToolSelect';

export { ToolInput } from './ToolInput';
export type { ToolInputProps, ToolInputSuggestion } from './ToolInput';

export { ToolForm } from './ToolForm';
export type { ToolFormProps, ToolFormField } from './ToolForm';

export { ResourceView } from './ResourceView';
export type { ResourceViewProps, ResourceMeta } from './ResourceView';

export { StreamingContent } from './StreamingContent';
export type { StreamingContentProps } from './StreamingContent';

export { ToolDataGrid } from './ToolDataGrid';
export type {
  ToolDataGridProps,
  ToolDataGridColumn,
  ToolDataGridRowAction,
  ToolDataGridData,
} from './ToolDataGrid';

// Legacy ActionButton (kept for compatibility, prefer ToolButton)
export { ActionButton } from './ActionButton';
export type { ActionButtonProps } from './ActionButton';

// ============================================================================
// Utility Components
// ============================================================================

export { RequireConnection } from './RequireConnection';
export type { RequireConnectionProps } from './RequireConnection';

export { ToolErrorBoundary } from './ToolErrorBoundary';
export type { ToolErrorBoundaryProps } from './ToolErrorBoundary';

// ============================================================================
// Hooks
// ============================================================================

export { useTool } from './useTool';
export type { UseToolOptions, UseToolReturn, ToolState } from './useTool';

export { useToolStream } from './useToolStream';
export type { UseToolStreamOptions, UseToolStreamReturn } from './useToolStream';

export { useResource } from './useResource';
export type { UseResourceOptions, UseResourceReturn } from './useResource';

export { useMessage } from './useMessage';
export type { UseMessageReturn } from './useMessage';

export { useHostContext } from './useHostContext';

export { useToolInput } from './useToolInput';
export { useToolInputPartial } from './useToolInputPartial';
export { useToolResult } from './useToolResult';
export { useToolSubscription } from './useToolSubscription';

// Spec-compliant hooks
export { useOpenAiGlobal } from './useOpenAiGlobal';
export {
  useToolOutput,
  useToolResponseMetadata,
  useToolInput as useToolInputSpec,
} from './useToolData';
export { useWidgetState } from './useWidgetState';
