/**
 * @UIApp Decorator
 *
 * Links an MCP tool to a React UI component.
 * When applied to a tool method, it:
 * 1. Adds _meta.ui/resourceUri to the tool definition
 * 2. Auto-registers a resource that renders the component to HTML
 *
 * This decorator is designed to work with @leanmcp/core decorators.
 */
import 'reflect-metadata';
import type React from 'react';

// Metadata keys
export const UI_APP_COMPONENT_KEY = 'ui:app:component';
export const UI_APP_URI_KEY = 'ui:app:uri';
export const UI_APP_OPTIONS_KEY = 'ui:app:options';

/**
 * Options for @UIApp decorator
 */
export interface UIAppOptions {
  /**
   * React component or path to component file (relative to service file).
   * - Use path string (e.g., './WeatherCard') for CLI build - avoids importing browser code in server
   * - Use component reference for direct SSR rendering
   */
  component: React.ComponentType<any> | string;
  /** Custom resource URI (auto-generated if not provided) */
  uri?: string;
  /** HTML document title */
  title?: string;
  /** Additional CSS styles */
  styles?: string;
}

/**
 * Decorator that links a tool to a UI component.
 *
 * When the tool is called, the host will fetch the UI resource
 * which returns the component rendered as HTML.
 *
 * @example
 * ```typescript
 * import { Tool } from '@leanmcp/core';
 * import { UIApp } from '@leanmcp/ui';
 * import { WeatherCard } from './WeatherCard';
 *
 * class WeatherService {
 *   @Tool({ description: 'Get weather for a city' })
 *   @UIApp({ component: WeatherCard })
 *   async getWeather(args: { city: string }) {
 *     return { city: args.city, temp: 22 };
 *   }
 * }
 * ```
 */
export function UIApp(options: UIAppOptions): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const methodName = String(propertyKey);
    // Use same pattern as @Resource in @leanmcp/core: className without 'service' suffix
    const className = target.constructor.name.toLowerCase().replace('service', '');

    // Generate URI using ui:// scheme (required by ext-apps hosts)
    const uri = options.uri ?? `ui://${className}/${methodName}`;

    // Store metadata on the method
    Reflect.defineMetadata(UI_APP_COMPONENT_KEY, options.component, descriptor.value!);
    Reflect.defineMetadata(UI_APP_URI_KEY, uri, descriptor.value!);
    Reflect.defineMetadata(UI_APP_OPTIONS_KEY, options, descriptor.value!);

    // Also store the resource URI for the @Tool decorator to pick up
    // The @Tool decorator in @leanmcp/core should check for this
    const existingMeta = Reflect.getMetadata('tool:meta', descriptor.value) || {};
    Reflect.defineMetadata(
      'tool:meta',
      {
        ...existingMeta,
        // New nested format (preferred by ext-apps 0.2.2)
        ui: {
          resourceUri: uri,
        },
        // Legacy flat format (for backwards compatibility)
        'ui/resourceUri': uri,
      },
      descriptor.value!
    );

    return descriptor;
  };
}

/**
 * Helper to get UIApp metadata from a method
 */
export function getUIAppMetadata(target: Function): UIAppOptions | undefined {
  const component = Reflect.getMetadata(UI_APP_COMPONENT_KEY, target);
  if (!component) return undefined;

  return {
    component,
    uri: Reflect.getMetadata(UI_APP_URI_KEY, target),
    ...Reflect.getMetadata(UI_APP_OPTIONS_KEY, target),
  };
}

/**
 * Helper to get the resource URI from a method
 */
export function getUIAppUri(target: Function): string | undefined {
  return Reflect.getMetadata(UI_APP_URI_KEY, target);
}
