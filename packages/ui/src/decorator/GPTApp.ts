/**
 * @GPTApp Decorator
 *
 * Links an MCP tool to a React UI component compliant with ChatGPT Apps SDK.
 *
 * When applied to a tool method, it:
 * 1. Adds _meta.ui/resourceUri to the tool definition
 * 2. Adds OpenAI-specific metadata (widgetAccessible, outputTemplate, etc.)
 * 3. Auto-registers a resource that renders the component to HTML with 'text/html+skybridge' mimeType
 */
import 'reflect-metadata';
import type React from 'react';

// Metadata keys
export const GPT_APP_COMPONENT_KEY = 'gptapp:component';
export const GPT_APP_URI_KEY = 'gptapp:uri';
export const GPT_APP_OPTIONS_KEY = 'gptapp:options';

/**
 * Options for @GPTApp decorator
 */
export interface GPTAppOptions {
  /**
   * React component or path to component file (relative to service file).
   * - Use path string (e.g., './WeatherCard') for CLI build - avoids importing browser code in server
   * - Use component reference for direct SSR rendering
   */
  component: React.ComponentType<any> | string;

  /** Custom resource URI (auto-generated ui://... if not provided) */
  uri?: string;

  /** HTML document title */
  title?: string;

  /** Additional CSS styles */
  styles?: string;

  // ========== GPT-specific options ==========

  /**
   * Allow widget to call tools via window.openai.callTool.
   * Maps to _meta["openai/widgetAccessible"]
   */
  widgetAccessible?: boolean;

  /**
   * Tool visibility: 'public' (default) or 'private'.
   * 'private' hides the tool from the model but keeps it callable by the widget.
   * Maps to _meta["openai/visibility"]
   */
  visibility?: 'public' | 'private';

  /**
   * Widget prefers border around iframe.
   * Maps to _meta["openai/widgetPrefersBorder"]
   */
  prefersBorder?: boolean;

  /**
   * Widget domain for API allowlists.
   * Maps to _meta["openai/widgetDomain"]
   */
  widgetDomain?: string;

  /**
   * Widget description for the model.
   * Maps to _meta["openai/widgetDescription"]
   */
  widgetDescription?: string;

  /**
   * Content Security Policy configuration.
   * Maps to _meta["openai/widgetCSP"]
   */
  csp?: {
    connect_domains?: string[];
    resource_domains?: string[];
    redirect_domains?: string[];
    frame_domains?: string[];
  };

  /**
   * File parameters (fields treated as file uploads).
   * Maps to _meta["openai/fileParams"]
   */
  fileParams?: string[];

  /**
   * Invocation messages shown during tool call.
   * Maps to _meta["openai/toolInvocation"]
   */
  invocation?: {
    invoking?: string; // e.g., "Preparing the board…"
    invoked?: string; // e.g., "Board ready."
  };
}

/**
 * Decorator that links a tool to a UI component for ChatGPT Apps.
 *
 * When the tool is called, the host will fetch the UI resource
 * which returns the component rendered as HTML with 'text/html+skybridge'.
 *
 * @example
 * ```typescript
 * import { Tool } from '@leanmcp/core';
 * import { GPTApp } from '@leanmcp/ui';
 * import { KanbanBoard } from './KanbanBoard';
 *
 * class KanbanService {
 *   @Tool({ description: 'Show Kanban Board' })
 *   @GPTApp({
 *     component: KanbanBoard,
 *     widgetAccessible: true,
 *     invocation: { invoking: 'Loading board...' }
 *   })
 *   async showBoard() { ... }
 * }
 * ```
 */
export function GPTApp(options: GPTAppOptions): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const methodName = String(propertyKey);
    // Use same pattern as @Resource in @leanmcp/core: className without 'service' suffix
    const className = target.constructor.name.toLowerCase().replace('service', '');

    // Generate URI using ui:// scheme (required by ext-apps hosts)
    const uri = options.uri ?? `ui://${className}/${methodName}`;

    // Store metadata on the method
    Reflect.defineMetadata(GPT_APP_COMPONENT_KEY, options.component, descriptor.value!);
    Reflect.defineMetadata(GPT_APP_URI_KEY, uri, descriptor.value!);
    Reflect.defineMetadata(GPT_APP_OPTIONS_KEY, options, descriptor.value!);

    // Also store the resource URI and OpenAI-specific metadata for the @Tool decorator to pick up
    const existingMeta = Reflect.getMetadata('tool:meta', descriptor.value) || {};

    // Build nested ui metadata (preferred by ext-apps 0.2.2)
    const uiMeta: Record<string, any> = {
      resourceUri: uri,
    };

    // Map visibility to ext-apps format
    if (options.visibility) {
      uiMeta.visibility = options.visibility === 'private' ? ['app'] : ['model', 'app'];
    }

    const openAiMeta: Record<string, any> = {
      // New nested format (preferred by ext-apps 0.2.2)
      ui: uiMeta,
      // Legacy flat format (for backwards compatibility)
      'ui/resourceUri': uri,
      'openai/outputTemplate': uri,
    };

    if (options.widgetAccessible !== undefined) {
      openAiMeta['openai/widgetAccessible'] = options.widgetAccessible;
    }

    if (options.visibility) {
      openAiMeta['openai/visibility'] = options.visibility;
    }

    if (options.prefersBorder !== undefined) {
      openAiMeta['openai/widgetPrefersBorder'] = options.prefersBorder;
    }

    if (options.widgetDomain) {
      openAiMeta['openai/widgetDomain'] = options.widgetDomain;
    }

    if (options.widgetDescription) {
      openAiMeta['openai/widgetDescription'] = options.widgetDescription;
    }

    if (options.csp) {
      openAiMeta['openai/widgetCSP'] = options.csp;
    }

    if (options.fileParams) {
      openAiMeta['openai/fileParams'] = options.fileParams;
    }

    if (options.invocation) {
      if (options.invocation.invoking)
        openAiMeta['openai/toolInvocation/invoking'] = options.invocation.invoking;
      if (options.invocation.invoked)
        openAiMeta['openai/toolInvocation/invoked'] = options.invocation.invoked;
    }

    Reflect.defineMetadata(
      'tool:meta',
      {
        ...existingMeta,
        ...openAiMeta,
      },
      descriptor.value!
    );

    return descriptor;
  };
}

/**
 * Helper to get GPTApp metadata from a method
 */
export function getGPTAppMetadata(target: Function): GPTAppOptions | undefined {
  const component = Reflect.getMetadata(GPT_APP_COMPONENT_KEY, target);
  if (!component) return undefined;

  return {
    component,
    uri: Reflect.getMetadata(GPT_APP_URI_KEY, target),
    ...Reflect.getMetadata(GPT_APP_OPTIONS_KEY, target),
  };
}

/**
 * Helper to get the resource URI from a method
 */
export function getGPTAppUri(target: Function): string | undefined {
  return Reflect.getMetadata(GPT_APP_URI_KEY, target);
}
