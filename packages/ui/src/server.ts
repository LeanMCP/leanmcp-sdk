/**
 * @leanmcp/ui/server - Server-safe exports for MCP Apps
 *
 * This entry point contains only server-safe exports that can be used
 * in Node.js environments without causing "window is not defined" errors.
 *
 * Use this in service files (index.ts) where you define your MCP tools:
 * ```typescript
 * import { UIApp } from '@leanmcp/ui/server';
 * ```
 *
 * For React components and hooks (browser-only), import from '@leanmcp/ui':
 * ```typescript
 * import { Card, useToolResult } from '@leanmcp/ui';
 * ```
 *
 * @packageDocumentation
 */

// ===========================================
// Decorator for linking tools to UI components
// ===========================================
export {
  UIApp,
  getUIAppMetadata,
  getUIAppUri,
  UI_APP_COMPONENT_KEY,
  UI_APP_URI_KEY,
  UI_APP_OPTIONS_KEY,
  type UIAppOptions,
} from './decorator';

// ===========================================
// GPTApp decorator for ChatGPT Apps
// ===========================================
export {
  GPTApp,
  getGPTAppMetadata,
  getGPTAppUri,
  GPT_APP_COMPONENT_KEY,
  GPT_APP_URI_KEY,
  GPT_APP_OPTIONS_KEY,
  type GPTAppOptions,
} from './decorator';

// ===========================================
// Re-export server helpers from ext-apps
// ===========================================
export {
  registerAppTool,
  registerAppResource,
  RESOURCE_URI_META_KEY,
  RESOURCE_MIME_TYPE,
  type McpUiAppToolConfig,
  type McpUiAppResourceConfig,
  type ToolConfig,
} from '@modelcontextprotocol/ext-apps/server';
