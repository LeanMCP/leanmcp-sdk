/**
 * LeanMCP SDK - Meta Package
 *
 * This package provides a unified entry point for all LeanMCP packages.
 * Install with: npm install leanmcp
 *
 * @packageDocumentation
 */

// ============================================================================
// Core Package - Main decorators, server, and runtime
// ============================================================================
export * from '@leanmcp/core';

// Named exports for convenience
export {
  // Server
  createHTTPServer,
  MCPServer,

  // Decorators
  Tool,
  Prompt,
  Resource,
  Optional,
  SchemaConstraint,

  // Types
  type MCPServerConstructorOptions,
} from '@leanmcp/core';

// ============================================================================
// Auth Package - Authentication and authorization
// ============================================================================
export * from '@leanmcp/auth';

export {
  AuthProvider,
  AuthProviderBase,
  Authenticated,
  type AuthenticatedOptions,
} from '@leanmcp/auth';

// ============================================================================
// UI Package - React components for MCP Apps
// ============================================================================
// Re-export everything from @leanmcp/ui
export * from '@leanmcp/ui';

// Named exports for commonly used items (for better IDE autocomplete)
export {
  // Core providers and hooks
  AppProvider,
  useMcpApp,
  useTool,

  // Components
  ActionButton,
  ToolForm,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Input,
  DataGrid,
  Chart,
  CodeBlock,
  AppShell,
  UIApp,
  getUIAppMetadata,
  getUIAppUri,

  // Types
  type AppProviderProps,
  type AppShellProps,
  type UIAppOptions,
} from '@leanmcp/ui';

// ============================================================================
// Utils Package - Utility functions
// ============================================================================
export * from '@leanmcp/utils';

// ============================================================================
// Elicitation Package - Interactive prompts and forms
// ============================================================================
export * from '@leanmcp/elicitation';

// ============================================================================
// Env Injection Package - Environment variable management
// ============================================================================
export * from '@leanmcp/env-injection';
