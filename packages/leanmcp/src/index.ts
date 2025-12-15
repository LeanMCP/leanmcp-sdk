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
export * from '@leanmcp/ui';

export {
    // Providers
    AppProvider,
    useMcpApp,

    // Layout Components
    AppShell,

    // Transport
    HTTPTransport,

    // Hooks
    useTool,
    useToolSubscription,

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

    // Types
    type AppProviderProps,
    type AppShellProps,
    type HTTPTransportConfig,
    type MCPTool,
    type MCPResource,
    type MCPPrompt,
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
