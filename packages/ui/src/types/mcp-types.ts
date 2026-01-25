/**
 * MCP-Native UI SDK - Core Types
 *
 * Type definitions for MCP-native component patterns. These types enable
 * declarative tool binding, result handling, and resource integration.
 */

import type { ReactNode } from 'react';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// ============================================================================
// Tool Binding Types
// ============================================================================

/**
 * Configuration for binding a UI component to an MCP tool
 *
 * @example
 * ```tsx
 * // Simple string binding
 * <ToolButton tool="refresh-data" />
 *
 * // Full configuration
 * <ToolButton tool={{
 *   name: "create-item",
 *   args: { type: "note" },
 *   transform: (r) => r.item
 * }} />
 * ```
 */
export interface ToolBinding<TArgs = Record<string, unknown>, TResult = unknown> {
  /** Tool name to call */
  name: string;
  /** Static arguments (merged with dynamic args) */
  args?: Partial<TArgs>;
  /** Transform result before passing to handlers */
  transform?: (result: CallToolResult) => TResult;
}

/**
 * Normalized tool binding - always an object, never a string
 */
export type NormalizedToolBinding<TArgs = Record<string, unknown>, TResult = unknown> = ToolBinding<
  TArgs,
  TResult
>;

/**
 * Helper to normalize string or ToolBinding to ToolBinding
 */
export function normalizeToolBinding<TArgs = Record<string, unknown>, TResult = unknown>(
  tool: string | ToolBinding<TArgs, TResult>
): NormalizedToolBinding<TArgs, TResult> {
  if (typeof tool === 'string') {
    return { name: tool };
  }
  return tool;
}

// ============================================================================
// MCP Action Props - Shared props for tool-enabled components
// ============================================================================

/**
 * Shared props for components that can trigger MCP tool calls
 */
export interface McpActionProps<TResult = unknown> {
  /** Tool to call on action */
  tool?: string | ToolBinding<Record<string, unknown>, TResult>;
  /** Called when tool execution starts */
  onToolStart?: () => void;
  /** Called on successful tool result */
  onToolSuccess?: (result: TResult) => void;
  /** Called on tool error */
  onToolError?: (error: Error) => void;
  /** Called after tool completes (success or error) */
  onToolComplete?: () => void;
  /** Disable component during tool execution (default: true) */
  disableWhileLoading?: boolean;
}

// ============================================================================
// Result Display Types
// ============================================================================

/**
 * Configuration for how to display tool results
 */
export interface ToolResultConfig {
  /** How to display the result */
  display: 'inline' | 'toast' | 'modal' | 'none';
  /** Custom result renderer */
  renderResult?: (result: unknown) => ReactNode;
  /** Auto-dismiss after ms (for toast) */
  autoDismiss?: number;
  /** Success message template */
  successMessage?: string | ((result: unknown) => string);
  /** Error message template */
  errorMessage?: string | ((error: Error) => string);
}

/**
 * Default result display config
 */
export const DEFAULT_RESULT_CONFIG: ToolResultConfig = {
  display: 'none',
  autoDismiss: 5000,
};

// ============================================================================
// Confirmation Dialog Types
// ============================================================================

/**
 * Configuration for confirmation dialog before tool execution
 */
export interface ConfirmConfig {
  /** Dialog title */
  title?: string;
  /** Dialog description */
  description?: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Confirm button variant */
  confirmVariant?: 'default' | 'destructive';
}

// ============================================================================
// Resource Binding Types
// ============================================================================

/**
 * Configuration for binding a component to an MCP resource
 */
export interface ResourceBinding {
  /** Resource URI */
  uri: string;
  /** Refresh interval in ms */
  refreshInterval?: number;
  /** Subscribe to resource changes */
  subscribe?: boolean;
}

// ============================================================================
// Tool State Types
// ============================================================================

/**
 * States a tool call can be in
 */
export type ToolState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Full tool call state with data
 */
export interface ToolCallState<T = unknown> {
  /** Current state */
  state: ToolState;
  /** Whether currently loading */
  loading: boolean;
  /** Last successful result */
  result: T | null;
  /** Last error */
  error: Error | null;
  /** Whether we have a result (success or error) */
  hasResult: boolean;
}

/**
 * Initial tool call state
 */
export const INITIAL_TOOL_STATE: ToolCallState = {
  state: 'idle',
  loading: false,
  result: null,
  error: null,
  hasResult: false,
};

// ============================================================================
// Hook Option Types
// ============================================================================

/**
 * Options for useTool hook
 */
export interface UseToolOptions<TArgs = Record<string, unknown>, TResult = unknown> {
  /** Static arguments merged with each call */
  defaultArgs?: Partial<TArgs>;
  /** Transform result before returning */
  transform?: (result: CallToolResult) => TResult;
  /** Retry configuration */
  retry?: number | { count: number; delay: number };
  /** Callbacks */
  onStart?: () => void;
  onSuccess?: (result: TResult) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

/**
 * Return type for useTool hook
 */
export interface UseToolReturn<TArgs = Record<string, unknown>, TResult = unknown> {
  /** Call the tool with arguments */
  call: (args?: TArgs) => Promise<TResult>;
  /** Mutate and call (convenience for forms) */
  mutate: (args: TArgs) => Promise<TResult>;
  /** Current state */
  state: ToolState;
  /** Loading indicator */
  loading: boolean;
  /** Last successful result */
  result: TResult | null;
  /** Last error */
  error: Error | null;
  /** Reset to initial state */
  reset: () => void;
  /** Retry last call */
  retry: () => Promise<TResult | null>;
  /** Abort ongoing call */
  abort: () => void;
}

/**
 * Options for useResource hook
 */
export interface UseResourceOptions<T = unknown> {
  /** Auto-refresh interval in ms */
  refreshInterval?: number;
  /** Subscribe to resource changes */
  subscribe?: boolean;
  /** Transform resource data */
  transform?: (data: unknown) => T;
  /** Skip initial fetch */
  skip?: boolean;
}

/**
 * Return type for useResource hook
 */
export interface UseResourceReturn<T = unknown> {
  /** Resource data */
  data: T | null;
  /** Loading state */
  loading: boolean;
  /** Error if any */
  error: Error | null;
  /** Refresh resource */
  refresh: () => Promise<T>;
  /** Last updated timestamp */
  lastUpdated: Date | null;
}

/**
 * Options for useToolStream hook
 */
export interface UseToolStreamOptions<T = unknown> {
  /** Called with each partial update */
  onPartial?: (data: Partial<T>) => void;
  /** Called when streaming completes */
  onComplete?: (data: T) => void;
}

/**
 * Return type for useToolStream hook
 */
export interface UseToolStreamReturn<T = unknown> {
  /** Current partial data */
  partial: Partial<T> | null;
  /** Final complete data */
  complete: T | null;
  /** Whether receiving partial data */
  isStreaming: boolean;
  /** Whether fully complete */
  isComplete: boolean;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * MCP App context value - extended for MCP-native components
 */
export interface McpAppContextExtended {
  /** Read a server resource */
  readResource?: (uri: string) => Promise<unknown>;
  /** List available tools */
  listTools?: () => Promise<Array<{ name: string; description?: string }>>;
  /** Get tool schema */
  getToolSchema?: (name: string) => Promise<unknown | null>;
}

/**
 * Tool provider configuration for scoped defaults
 */
export interface ToolProviderConfig {
  /** Default result display */
  resultDisplay?: ToolResultConfig;
  /** Default error handler */
  onError?: (error: Error) => void;
  /** Show loading states globally */
  showLoading?: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract the result type from a tool binding
 */
export type ToolResultType<T> = T extends ToolBinding<any, infer R> ? R : unknown;

/**
 * Extract the args type from a tool binding
 */
export type ToolArgsType<T> = T extends ToolBinding<infer A, any> ? A : Record<string, unknown>;

/**
 * Make selected properties required
 */
export type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>;
