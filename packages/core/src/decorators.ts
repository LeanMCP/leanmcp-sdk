import "reflect-metadata";

// ============================================================================
// Core MCP Decorators - Type-safe with automatic name inference
// ============================================================================

export interface ToolOptions {
  description?: string;
  inputClass?: any;  // Optional: Explicit input class for schema generation. Omit for tools with no input.
}

export interface PromptOptions {
  description?: string;
  inputClass?: any;  // Optional: Explicit input class for schema generation
}

export interface ResourceOptions {
  description?: string;
  mimeType?: string;
  inputClass?: any;  // Optional: Explicit input class for schema generation
}

/**
 * Marks a method as an MCP tool (callable function)
 * - Tool name is automatically derived from function name
 * - Input schema is explicitly defined via inputClass
 * - Full type safety at compile time
 * 
 * @example
 * class AnalyzeSentimentInput {
 *   @SchemaConstraint({ description: 'Text to analyze' })
 *   text!: string;
 *   
 *   @Optional()
 *   language?: string;
 * }
 * 
 * @Tool({ 
 *   description: 'Analyze sentiment of text',
 *   inputClass: AnalyzeSentimentInput
 * })
 * async analyzeSentiment(args: AnalyzeSentimentInput): Promise<AnalyzeSentimentOutput> {
 *   // Tool name will be: "analyzeSentiment"
 * }
 */
export function Tool(options: ToolOptions = {}): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const toolName = String(propertyKey);
    
    Reflect.defineMetadata("tool:name", toolName, descriptor.value!);
    Reflect.defineMetadata("tool:description", options.description || "", descriptor.value!);
    Reflect.defineMetadata("tool:propertyKey", propertyKey, descriptor.value!);
    
    // Store inputClass if provided
    if (options.inputClass) {
      Reflect.defineMetadata("tool:inputClass", options.inputClass, descriptor.value!);
    }
  };
}

/**
 * Marks a method as an MCP prompt template
 * - Prompt name is automatically derived from function name
 * - Input schema can be explicitly defined via inputClass or inferred from parameter type
 * 
 * @example
 * class PromptInput {
 *   @SchemaConstraint({ description: 'Auth token' })
 *   token!: string;
 * }
 * 
 * @Prompt({ 
 *   description: 'Generate sentiment analysis prompt',
 *   inputClass: PromptInput 
 * })
 * sentimentPrompt(args: PromptInput) {
 *   // Prompt name will be: "sentimentPrompt"
 * }
 */
export function Prompt(options: PromptOptions = {}): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const promptName = String(propertyKey);
    
    Reflect.defineMetadata("prompt:name", promptName, descriptor.value!);
    Reflect.defineMetadata("prompt:description", options.description || "", descriptor.value!);
    Reflect.defineMetadata("prompt:propertyKey", propertyKey, descriptor.value!);
    
    // Store inputClass if explicitly provided
    if (options.inputClass) {
      Reflect.defineMetadata("prompt:inputClass", options.inputClass, descriptor.value!);
    } else {
      // Fallback to parameter type inference
      const paramTypes = Reflect.getMetadata("design:paramtypes", target, propertyKey);
      if (paramTypes && paramTypes.length > 0 && paramTypes[0] !== Object) {
        Reflect.defineMetadata("prompt:inputClass", paramTypes[0], descriptor.value!);
      }
    }
  };
}

/**
 * Marks a method as an MCP resource (data source/endpoint)
 * - Resource URI is automatically derived from function name (e.g., "myservice://functionName")
 * - Can be customized with description, mimeType, and input schema
 * 
 * @example
 * class ResourceInput {
 *   @SchemaConstraint({ description: 'Auth token' })
 *   token!: string;
 * }
 * 
 * @Resource({ 
 *   description: 'Service statistics', 
 *   mimeType: 'application/json',
 *   inputClass: ResourceInput 
 * })
 * getStats(args: ResourceInput) {
 *   // Resource URI will be: "servicename://getStats"
 *   return { stats: '...' };
 * }
 */
export function Resource(options: ResourceOptions = {}): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const resourceName = String(propertyKey);
    // Generate URI from class name and method name
    const className = target.constructor.name.toLowerCase().replace('service', '');
    const resourceUri = `${className}://${resourceName}`;
    
    Reflect.defineMetadata("resource:uri", resourceUri, descriptor.value!);
    Reflect.defineMetadata("resource:name", resourceName, descriptor.value!);
    Reflect.defineMetadata("resource:description", options.description || "", descriptor.value!);
    Reflect.defineMetadata("resource:mimeType", options.mimeType || "application/json", descriptor.value!);
    Reflect.defineMetadata("resource:propertyKey", propertyKey, descriptor.value!);
    
    // Store inputClass if provided
    if (options.inputClass) {
      Reflect.defineMetadata("resource:inputClass", options.inputClass, descriptor.value!);
    }
  };
}

// ============================================================================
// Authentication Decorators
// ============================================================================

export interface AuthOptions {
  provider: string;
}

/**
 * Adds authentication requirements using a specified provider
 * @example
 * @Auth({ provider: 'clerk' })
 * export class MyService { }
 * 
 * @Tool({ description: 'Premium feature' })
 * @Auth({ provider: 'stripe' })
 * async premiumAction() { }
 */
export function Auth(options: AuthOptions): ClassDecorator & MethodDecorator {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (propertyKey && descriptor) {
      // Method decorator
      Reflect.defineMetadata("auth:provider", options.provider, descriptor.value!);
      Reflect.defineMetadata("auth:required", true, descriptor.value!);
    } else {
      // Class decorator
      Reflect.defineMetadata("auth:provider", options.provider, target);
      Reflect.defineMetadata("auth:required", true, target);
    }
  };
}

/**
 * Injects environment variables or user-level configuration into the tool instance
 */
export function UserEnvs(): PropertyDecorator {
  return (target, propertyKey) => {
    const constructor = target.constructor;
    Reflect.defineMetadata("userenvs:propertyKey", propertyKey, constructor);
  };
}

// ============================================================================
// Schema Decorators (for property-level constraints)
// ============================================================================

/**
 * Property decorator to mark a field as optional in JSON Schema
 * 
 * @example
 * class MyInput {
 *   required!: string;
 *   
 *   @Optional()
 *   optional?: string;
 * }
 */

// NOTE: Optional and SchemaConstraint are now exported from schema-generator.ts

// ============================================================================
// UI & Rendering Decorators
// ============================================================================

/**
 * Links a UI component or frontend visualization to a tool or resource
 * @param component - UI component name
 */
export function UI(component: string): ClassDecorator & MethodDecorator {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (propertyKey && descriptor) {
      // Method decorator
      Reflect.defineMetadata("ui:component", component, descriptor.value!);
    } else {
      // Class decorator
      Reflect.defineMetadata("ui:component", component, target);
    }
  };
}

/**
 * Specifies how output should be rendered
 * @param format - Render format ('markdown', 'html', 'json', 'chart', 'table')
 */
export function Render(format: 'markdown' | 'html' | 'json' | 'chart' | 'table' | string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata("render:format", format, descriptor.value!);
  };
}

// ============================================================================
// Workflow Decorators
// ============================================================================

/**
 * Marks a tool, prompt, or resource as deprecated
 * @param message - Optional deprecation message
 */
export function Deprecated(message?: string): ClassDecorator & MethodDecorator {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    const deprecationMessage = message || 'This feature is deprecated';
    
    if (propertyKey && descriptor) {
      // Method decorator
      Reflect.defineMetadata("deprecated:message", deprecationMessage, descriptor.value!);
      Reflect.defineMetadata("deprecated:true", true, descriptor.value!);
      
      // Wrap method to log deprecation warning
      const originalMethod = descriptor.value as Function;
      descriptor.value = function(this: any, ...args: any[]) {
        console.warn(`DEPRECATED: ${String(propertyKey)} - ${deprecationMessage}`);
        return originalMethod.apply(this, args);
      } as any;
    } else {
      // Class decorator
      Reflect.defineMetadata("deprecated:message", deprecationMessage, target);
      Reflect.defineMetadata("deprecated:true", true, target);
      console.warn(`DEPRECATED: ${target.name} - ${deprecationMessage}`);
    }
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get metadata for a specific method
 */
export function getMethodMetadata(method: Function) {
  return {
    // Tool metadata
    toolName: Reflect.getMetadata("tool:name", method),
    toolDescription: Reflect.getMetadata("tool:description", method),
    
    // Prompt metadata
    promptName: Reflect.getMetadata("prompt:name", method),
    promptDescription: Reflect.getMetadata("prompt:description", method),
    
    // Resource metadata
    resourceUri: Reflect.getMetadata("resource:uri", method),
    resourceName: Reflect.getMetadata("resource:name", method),
    resourceDescription: Reflect.getMetadata("resource:description", method),
    
    // Common metadata
    inputSchema: Reflect.getMetadata("schema:input", method),
    outputSchema: Reflect.getMetadata("schema:output", method),
    authProvider: Reflect.getMetadata("auth:provider", method),
    authRequired: Reflect.getMetadata("auth:required", method),
    uiComponent: Reflect.getMetadata("ui:component", method),
    renderFormat: Reflect.getMetadata("render:format", method),
    deprecated: Reflect.getMetadata("deprecated:true", method),
    deprecationMessage: Reflect.getMetadata("deprecated:message", method),
  };
}

/**
 * Get all methods with a specific decorator from a class
 */
export function getDecoratedMethods(target: any, metadataKey: string): Array<{ method: Function; propertyKey: string; metadata: any }> {
  const methods: Array<{ method: Function; propertyKey: string; metadata: any }> = [];
  const prototype = target.prototype || target;
  
  for (const propertyKey of Object.getOwnPropertyNames(prototype)) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyKey);
    if (descriptor && typeof descriptor.value === 'function') {
      const metadata = Reflect.getMetadata(metadataKey, descriptor.value);
      if (metadata !== undefined) {
        methods.push({
          method: descriptor.value,
          propertyKey,
          metadata
        });
      }
    }
  }
  
  return methods;
}
