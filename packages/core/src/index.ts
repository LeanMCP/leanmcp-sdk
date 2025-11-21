import "reflect-metadata";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import Ajv from "ajv";

export * from "./decorators";
export * from "./schema-generator";
export * from "./http-server";
export * from "./logger";
export * from "./validation";
import { getMethodMetadata, getDecoratedMethods } from "./decorators";
import { classToJsonSchemaWithConstraints } from "./schema-generator";
import { Logger, LogLevel } from "./logger";

// Schema validator
const ajv = new Ajv();

export interface MCPServerOptions {
  servicesDir: string;
  port?: number;
  cors?: boolean;
  logging?: boolean;
}

export interface MCPServerConstructorOptions {
  name: string;
  version: string;
  logging?: boolean;
  debug?: boolean;         // Enable detailed debug logs (default: false)
  autoDiscover?: boolean;  // Enable automatic service discovery (default: true)
  mcpDir?: string;         // Custom mcp directory path (optional)
  serviceFactories?: Record<string, () => any>;  // Dependency injection factories
  // HTTP Server options (used when passing to createHTTPServer directly)
  port?: number;
  cors?: boolean | {
    origin?: string | string[];
    credentials?: boolean;
  };
  sessionTimeout?: number;
}

interface RegisteredTool {
  name: string;
  description: string;
  inputSchema: any;
  method: Function;
  instance: any;
  propertyKey: string;
}

interface RegisteredPrompt {
  name: string;
  description: string;
  arguments: any[];
  method: Function;
  instance: any;
  propertyKey: string;
}

interface RegisteredResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  inputSchema?: any;
  method: Function;
  instance: any;
  propertyKey: string;
}

/**
 * MCPServer - A simplified server class for manually registering services
 * Use this when you want to explicitly instantiate and register your services
 */
export class MCPServer {
  private server: Server;
  private tools: Map<string, RegisteredTool> = new Map();
  private prompts: Map<string, RegisteredPrompt> = new Map();
  private resources: Map<string, RegisteredResource> = new Map();
  private logging: boolean;
  private logger: Logger;
  private options: MCPServerConstructorOptions;
  private initPromise: Promise<void>;
  private autoDiscovered: boolean = false;

  constructor(options: MCPServerConstructorOptions) {
    this.options = options;
    this.logging = options.logging || false;
    
    // Determine log level based on logging and debug flags
    let logLevel = LogLevel.NONE;
    if (options.logging) {
      logLevel = options.debug ? LogLevel.DEBUG : LogLevel.INFO;
    }
    
    this.logger = new Logger({
      level: logLevel,
      prefix: 'MCPServer'
    });

    this.server = new Server(
      {
        name: options.name,
        version: options.version,
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
    
    // Start auto-discovery immediately
    this.initPromise = this.autoInit();
  }

  /**
   * Internal initialization - runs automatically in constructor
   */
  private async autoInit() {
    const options = this.options;
    
    if (options.autoDiscover !== false) {
      await this.autoDiscoverServices(options.mcpDir, options.serviceFactories);
    }
  }

  /**
   * Wait for initialization to complete
   * This is called internally by createHTTPServer
   */
  async waitForInit(): Promise<void> {
    await this.initPromise;
  }
  
  /**
   * Automatically discover and register services from the mcp directory
   * Called by init() unless autoDiscover is set to false
   */
  private async autoDiscoverServices(
    customMcpDir?: string,
    serviceFactories?: Record<string, () => any>
  ) {
    if (this.autoDiscovered) return;
    this.autoDiscovered = true;
    
    try {
      // Determine the mcp directory location
      let mcpDir: string;
      
      if (customMcpDir) {
        // Use custom directory if provided
        mcpDir = customMcpDir;
      } else {
        // Auto-detect: Look for mcp directory relative to the main entry point
        // Get the directory of the file that called new MCPServer()
        const callerFile = this.getCallerFile();
        if (callerFile) {
          const callerDir = path.dirname(callerFile);
          mcpDir = path.join(callerDir, 'mcp');
        } else {
          // Fallback to current working directory
          mcpDir = path.join(process.cwd(), 'mcp');
        }
      }
      
      // Only auto-register if the directory exists
      if (fs.existsSync(mcpDir)) {
        this.logger.debug(`Auto-discovering services from: ${mcpDir}`);
        await this.autoRegisterServices(mcpDir, serviceFactories);
      } else {
        this.logger.debug(`MCP directory not found at ${mcpDir}, skipping auto-discovery`);
      }
    } catch (error: any) {
      this.logger.warn(`Auto-discovery failed: ${error.message}`);
    }
  }
  
  /**
   * Get the file path of the caller (the file that instantiated MCPServer)
   */
  private getCallerFile(): string | null {
    const originalPrepareStackTrace = Error.prepareStackTrace;
    try {
      const err = new Error();
      Error.prepareStackTrace = (_, stack) => stack;
      const stack = err.stack as any;
            
      // Find the first stack frame that's not from the @leanmcp/core package
      for (let i = 0; i < stack.length; i++) {
        let fileName = stack[i].getFileName();
        if (!fileName) continue;
        
        // Convert file:// URL to regular path first
        if (fileName.startsWith('file://')) {
          // Use URL API for proper cross-platform handling
          try {
            const url = new URL(fileName);
            // URL.pathname automatically decodes URL-encoded characters
            fileName = decodeURIComponent(url.pathname);
            
            // On Windows, remove leading slash (e.g., /C:/path -> C:/path)
            if (process.platform === 'win32' && fileName.startsWith('/')) {
              fileName = fileName.substring(1);
            }
            // On Unix-like systems, keep the leading slash (it's the root directory)
          } catch (e) {
            // Fallback to simple string replacement if URL parsing fails
            fileName = fileName.replace('file://', '');
            if (process.platform === 'win32' && fileName.startsWith('/')) {
              fileName = fileName.substring(1);
            }
          }
        }
        
        // Normalize path separators to forward slashes for OS-agnostic comparison
        const normalizedPath = fileName.replace(/\\/g, '/');
        
        // Check if this file is NOT from the @leanmcp/core package
        const isLeanMCPCore = normalizedPath.includes('@leanmcp/core') || 
                              normalizedPath.includes('leanmcp-sdk/packages/core');
        
        // Check if this is a valid TypeScript/JavaScript file
        const isValidExtension = fileName.endsWith('.ts') || 
                                 fileName.endsWith('.js') || 
                                 fileName.endsWith('.mjs');
                
        if (!isLeanMCPCore && isValidExtension) {
          return fileName;
        }
      }
      
      this.logger.debug('No suitable caller file found in stack trace');
      return null;
    } finally {
      Error.prepareStackTrace = originalPrepareStackTrace;
    }
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: any[] = [];
      
      for (const [name, tool] of this.tools.entries()) {
        tools.push({
          name,
          description: tool.description,
          inputSchema: tool.inputSchema || {
            type: "object",
            properties: {},
          },
        });
      }
      
      return { tools };
    });

    // Call a tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const toolName = request.params.name;
      
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new Error(`Tool ${toolName} not found`);
      }

      const methodMeta = getMethodMetadata(tool.method);

      // Validate input if schema is defined
      if (methodMeta.inputSchema) {
        const validate = ajv.compile(methodMeta.inputSchema);
        const valid = validate(request.params.arguments || {});
        if (!valid) {
          throw new Error(`Input validation failed: ${JSON.stringify(validate.errors)}`);
        }
      }

      // Execute the method
      try {
        // Extract _meta for authentication (if present) - it's at params level, not arguments level
        const meta = request.params._meta;
        const result = await tool.method.call(tool.instance, request.params.arguments, meta);
        
        // Format result
        let formattedResult = result;
        if (methodMeta.renderFormat === 'markdown' && typeof result === 'string') {
          formattedResult = result;
        } else if (methodMeta.renderFormat === 'json' || typeof result === 'object') {
          formattedResult = JSON.stringify(result, null, 2);
        } else {
          formattedResult = String(result);
        }

        return {
          content: [
            {
              type: "text",
              text: formattedResult,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources: any[] = [];
      
      for (const [uri, resource] of this.resources.entries()) {
        const resourceInfo: any = {
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
        };
        
        // Include inputSchema if it exists
        if (resource.inputSchema) {
          resourceInfo.inputSchema = resource.inputSchema;
        }
        
        resources.push(resourceInfo);
      }
      
      return { resources };
    });

    // Read a resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
      const uri = request.params.uri;
      
      const resource = this.resources.get(uri);
      if (!resource) {
        throw new Error(`Resource ${uri} not found`);
      }

      try {
        const result = await resource.method.call(resource.instance);

        return {
          contents: [
            {
              uri,
              mimeType: resource.mimeType,
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to read resource ${uri}: ${error.message}`);
      }
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts: any[] = [];
      
      for (const [name, prompt] of this.prompts.entries()) {
        prompts.push({
          name,
          description: prompt.description,
          arguments: prompt.arguments,
        });
      }
      
      return { prompts };
    });

    // Get a specific prompt
    this.server.setRequestHandler(GetPromptRequestSchema, async (request: any) => {
      const promptName = request.params.name;
      
      const prompt = this.prompts.get(promptName);
      if (!prompt) {
        throw new Error(`Prompt ${promptName} not found`);
      }

      try {
        const result = await prompt.method.call(prompt.instance, request.params.arguments || {});
        
        // If result is already in proper format, return it
        if (result && result.messages) {
          return result;
        }
        
        // Otherwise, format it
        return {
          description: prompt.description,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: typeof result === 'string' ? result : JSON.stringify(result),
              },
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to get prompt ${promptName}: ${error.message}`);
      }
    });
  }

  /**
   * Auto-register all services from the mcp directory
   * Scans the directory recursively and registers all exported classes
   * 
   * @param mcpDir - Path to the mcp directory containing service files
   * @param serviceFactories - Optional map of service class names to factory functions for dependency injection
   * 
   * @example
   * // Auto-register services with no dependencies
   * await server.autoRegisterServices('./mcp');
   * 
   * @example
   * // Auto-register with dependency injection
   * await server.autoRegisterServices('./mcp', {
   *   SlackService: () => new SlackService(process.env.SLACK_TOKEN),
   *   AuthService: () => new AuthService(authProvider)
   * });
   */
  async autoRegisterServices(
    mcpDir: string, 
    serviceFactories?: Record<string, () => any>
  ) {
    this.logger.debug(`Auto-registering services from: ${mcpDir}`);
    
    if (!fs.existsSync(mcpDir)) {
      this.logger.warn(`MCP directory not found: ${mcpDir}`);
      return;
    }

    const serviceFiles = this.findServiceFiles(mcpDir);
    this.logger.debug(`Found ${serviceFiles.length} service file(s)`);

    for (const filePath of serviceFiles) {
      try {
        await this.loadAndRegisterService(filePath, serviceFactories);
      } catch (error: any) {
        this.logger.error(`Failed to load service from ${filePath}: ${error.message}`);
      }
    }
  }

  /**
   * Recursively find all index.ts/index.js files in the mcp directory
   */
  private findServiceFiles(dir: string): string[] {
    const files: string[] = [];
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        files.push(...this.findServiceFiles(fullPath));
      } else if (entry.isFile()) {
        // Look for index.ts or index.js files
        if (entry.name === 'index.ts' || entry.name === 'index.js') {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }

  /**
   * Load a service file and register all exported classes
   */
  private async loadAndRegisterService(
    filePath: string,
    serviceFactories?: Record<string, () => any>
  ) {
    this.logger.debug(`Loading service from: ${filePath}`);
    
    // Convert to file URL for dynamic import
    const fileUrl = pathToFileURL(filePath).href;
    
    // Dynamic import the module
    const module = await import(fileUrl);
    
    // Find all exported classes
    let registeredCount = 0;
    for (const [exportName, exportValue] of Object.entries(module)) {
      // Check if it's a class (constructor function)
      if (typeof exportValue === 'function' && exportValue.prototype) {
        try {
          let instance: any;
          
          // Check if a factory function is provided for this service
          if (serviceFactories && serviceFactories[exportName]) {
            instance = serviceFactories[exportName]();
            this.logger.info(`Using factory for service: ${exportName}`);
          } else {
            // Try to instantiate with no-args constructor
            instance = new (exportValue as any)();
          }
          
          this.registerService(instance);
          registeredCount++;
          this.logger.debug(`Registered service: ${exportName} from ${path.basename(filePath)}`);
        } catch (error: any) {
          this.logger.warn(`Skipped ${exportName}: ${error.message}`);
        }
      }
    }
    
    if (registeredCount === 0) {
      this.logger.warn(`No services registered from ${filePath}`);
    }
  }

  /**
   * Register a service instance with decorated methods
   */
  registerService(instance: any) {
    const cls = instance.constructor;

    // Find all @Tool decorated methods
    const toolMethods = getDecoratedMethods(cls, "tool:name");
    for (const { method, propertyKey } of toolMethods) {
      const methodMeta = getMethodMetadata(method);
      
      // Check if this is a class-based schema (automatic type inference)
      const inputClass = (Reflect as any).getMetadata?.("tool:inputClass", method);
      
      let inputSchema = methodMeta.inputSchema;
      if (inputClass) {
        // Generate JSON Schema from TypeScript class
        inputSchema = classToJsonSchemaWithConstraints(inputClass);
      }
      
      this.tools.set(methodMeta.toolName!, {
        name: methodMeta.toolName!,
        description: methodMeta.toolDescription || "",
        inputSchema: inputSchema,
        method,
        instance,
        propertyKey,
      });
      
      if (this.logging) {
        this.logger.debug(`Registered tool: ${methodMeta.toolName}${inputClass ? ' (class-based schema)' : ''}`);
      }
    }

    // Find all @Prompt decorated methods
    const promptMethods = getDecoratedMethods(cls, "prompt:name");
    for (const { method, propertyKey } of promptMethods) {
      const methodMeta = getMethodMetadata(method);
      
      // Check if this is a class-based schema (automatic type inference)
      const inputClass = (Reflect as any).getMetadata?.("prompt:inputClass", method);
      
      let inputSchema = methodMeta.inputSchema;
      if (inputClass) {
        // Generate JSON Schema from TypeScript class
        inputSchema = classToJsonSchemaWithConstraints(inputClass);
      }
      
      const promptArgs = inputSchema?.properties 
        ? Object.keys(inputSchema.properties).map(key => ({
            name: key,
            description: inputSchema?.properties?.[key]?.description || "",
            required: inputSchema?.required?.includes(key) || false,
          }))
        : [];

      this.prompts.set(methodMeta.promptName!, {
        name: methodMeta.promptName!,
        description: methodMeta.promptDescription || "",
        arguments: promptArgs,
        method,
        instance,
        propertyKey,
      });
      
      if (this.logging) {
        this.logger.debug(`Registered prompt: ${methodMeta.promptName}`);
      }
    }

    // Find all @Resource decorated methods
    const resourceMethods = getDecoratedMethods(cls, "resource:uri");
    for (const { method, propertyKey } of resourceMethods) {
      const methodMeta = getMethodMetadata(method);
      
      // Check if this is a class-based schema (automatic type inference)
      const inputClass = (Reflect as any).getMetadata?.("resource:inputClass", method);
      
      let inputSchema = methodMeta.inputSchema;
      if (inputClass) {
        // Generate JSON Schema from TypeScript class
        inputSchema = classToJsonSchemaWithConstraints(inputClass);
      }
      
      // Read mimeType from metadata (set by @Resource decorator)
      const mimeType = (Reflect as any).getMetadata?.("resource:mimeType", method) || "application/json";

      this.resources.set(methodMeta.resourceUri!, {
        uri: methodMeta.resourceUri!,
        name: methodMeta.resourceName || methodMeta.resourceUri!,
        description: methodMeta.resourceDescription || "",
        mimeType: mimeType,
        inputSchema: inputSchema,
        method,
        instance,
        propertyKey,
      });
      
      if (this.logging) {
        this.logger.debug(`Registered resource: ${methodMeta.resourceUri}`);
      }
    }
  }

  /**
   * Get the underlying MCP SDK Server instance
   * Attaches waitForInit method for HTTP server initialization
   */
  getServer() {
    // Attach waitForInit to the server instance for HTTP server to use
    (this.server as any).waitForInit = () => this.waitForInit();
    return this.server;
  }
}

export class MCPServerRuntime {
  private server: Server;
  private tools: Map<string, RegisteredTool> = new Map();
  private prompts: Map<string, RegisteredPrompt> = new Map();
  private resources: Map<string, RegisteredResource> = new Map();
  private options: MCPServerOptions;
  private logger: Logger;

  constructor(options: MCPServerOptions) {
    this.options = options;
    this.logger = new Logger({
      level: this.options.logging ? LogLevel.INFO : LogLevel.NONE,
      prefix: 'MCPServerRuntime'
    });
    this.server = new Server(
      {
        name: "leanmcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: any[] = [];
      
      for (const [name, tool] of this.tools.entries()) {
        tools.push({
          name,
          description: tool.description,
          inputSchema: tool.inputSchema || {
            type: "object",
            properties: {},
          },
        });
      }
      
      return { tools };
    });

    // Call a tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const toolName = request.params.name;
      
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new Error(`Tool ${toolName} not found`);
      }

      const methodMeta = getMethodMetadata(tool.method);

      // Validate input if schema is defined
      if (methodMeta.inputSchema) {
        const validate = ajv.compile(methodMeta.inputSchema);
        const valid = validate(request.params.arguments || {});
        if (!valid) {
          throw new Error(`Input validation failed: ${JSON.stringify(validate.errors)}`);
        }
      }

      // Check authentication
      if (methodMeta.authRequired) {
        if (this.options.logging) {
          this.logger.info(`Auth required for ${toolName} (provider: ${methodMeta.authProvider})`);
        }
      }

      // Execute the method
      try {
        // Extract _meta for authentication (if present) - it's at params level, not arguments level
        const meta = request.params._meta;
        const result = await tool.method.call(tool.instance, request.params.arguments, meta);
        
        // Handle elicitation
        if (result && typeof result === 'object' && result.type === 'elicitation') {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
            isError: false,
          };
        }

        // Format result based on render format
        let formattedResult = result;
        if (methodMeta.renderFormat === 'markdown' && typeof result === 'string') {
          formattedResult = result;
        } else if (methodMeta.renderFormat === 'json' || typeof result === 'object') {
          formattedResult = JSON.stringify(result, null, 2);
        } else {
          formattedResult = String(result);
        }

        return {
          content: [
            {
              type: "text",
              text: formattedResult,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources: any[] = [];
      
      for (const [uri, resource] of this.resources.entries()) {
        resources.push({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
        });
      }
      
      return { resources };
    });

    // Read a resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
      const uri = request.params.uri;
      
      const resource = this.resources.get(uri);
      if (!resource) {
        throw new Error(`Resource ${uri} not found`);
      }

      try {
        const result = await resource.method.call(resource.instance);

        return {
          contents: [
            {
              uri,
              mimeType: resource.mimeType,
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to read resource ${uri}: ${error.message}`);
      }
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts: any[] = [];
      
      for (const [name, prompt] of this.prompts.entries()) {
        prompts.push({
          name,
          description: prompt.description,
          arguments: prompt.arguments,
        });
      }
      
      return { prompts };
    });

    // Get a specific prompt
    this.server.setRequestHandler(GetPromptRequestSchema, async (request: any) => {
      const promptName = request.params.name;
      
      const prompt = this.prompts.get(promptName);
      if (!prompt) {
        throw new Error(`Prompt ${promptName} not found`);
      }

      try {
        // Call the prompt method to get the prompt template/messages
        const result = await prompt.method.call(prompt.instance, request.params.arguments || {});
        
        // If result is already in proper format, return it
        if (result && result.messages) {
          return result;
        }
        
        // Otherwise, format it
        return {
          description: prompt.description,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: typeof result === 'string' ? result : JSON.stringify(result),
              },
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to get prompt ${promptName}: ${error.message}`);
      }
    });
  }

  async loadServices() {
    const absPath = path.resolve(this.options.servicesDir);
    
    if (!fs.existsSync(absPath)) {
      this.logger.error(`Services directory not found: ${absPath}`);
      return;
    }

    const files = fs.readdirSync(absPath);
    let toolCount = 0;
    let promptCount = 0;
    let resourceCount = 0;

    for (const dir of files) {
      const modulePath = path.join(absPath, dir, "index.ts");
      const modulePathJs = path.join(absPath, dir, "index.js");
      
      const finalPath = fs.existsSync(modulePath) ? modulePath : 
                       fs.existsSync(modulePathJs) ? modulePathJs : null;
      
      if (finalPath) {
        try {
          // Convert absolute path to file:// URL (works on all platforms)
          const fileUrl = pathToFileURL(finalPath).href;
          const mod = await import(fileUrl);
          const exportedClasses = Object.values(mod).filter(
            (val) => typeof val === "function" && val.prototype
          );

          for (const cls of exportedClasses) {
            // Create instance
            const instance = new (cls as any)();
            
            // Inject user envs if decorator is present
            const envsPropKey = (Reflect as any).getMetadata?.("userenvs:propertyKey", cls);
            if (envsPropKey) {
              instance[envsPropKey] = process.env;
            }

            // Find all @Tool decorated methods
            const toolMethods = getDecoratedMethods(cls, "tool:name");
            for (const { method, propertyKey, metadata } of toolMethods) {
              const methodMeta = getMethodMetadata(method);
              
              // Check if this is a class-based schema (automatic type inference)
              const inputClass = (Reflect as any).getMetadata?.("tool:inputClass", method);
              const outputClass = (Reflect as any).getMetadata?.("tool:outputClass", method);
              
              let inputSchema = methodMeta.inputSchema;
              if (inputClass) {
                // Generate JSON Schema from TypeScript class
                inputSchema = classToJsonSchemaWithConstraints(inputClass);
              }
              
              this.tools.set(methodMeta.toolName!, {
                name: methodMeta.toolName!,
                description: methodMeta.toolDescription || "",
                inputSchema: inputSchema,
                method,
                instance,
                propertyKey,
              });
              toolCount++;
              if (this.options.logging) {
                this.logger.info(`Loaded tool: ${methodMeta.toolName}${inputClass ? ' (class-based schema)' : ''}`);
              }
            }

            // Find all @Prompt decorated methods
            const promptMethods = getDecoratedMethods(cls, "prompt:name");
            for (const { method, propertyKey, metadata } of promptMethods) {
              const methodMeta = getMethodMetadata(method);
              const promptArgs = methodMeta.inputSchema?.properties 
                ? Object.keys(methodMeta.inputSchema.properties).map(key => ({
                    name: key,
                    description: methodMeta.inputSchema?.properties?.[key]?.description || "",
                    required: methodMeta.inputSchema?.required?.includes(key) || false,
                  }))
                : [];
              
              this.prompts.set(methodMeta.promptName!, {
                name: methodMeta.promptName!,
                description: methodMeta.promptDescription || "",
                arguments: promptArgs,
                method,
                instance,
                propertyKey,
              });
              promptCount++;
              if (this.options.logging) {
                this.logger.info(`Loaded prompt: ${methodMeta.promptName}`);
              }
            }

            // Find all @Resource decorated methods
            const resourceMethods = getDecoratedMethods(cls, "resource:uri");
            for (const { method, propertyKey, metadata } of resourceMethods) {
              const methodMeta = getMethodMetadata(method);
              this.resources.set(methodMeta.resourceUri!, {
                uri: methodMeta.resourceUri!,
                name: methodMeta.resourceName || methodMeta.resourceUri!,
                description: methodMeta.resourceDescription || "",
                mimeType: "application/json",
                method,
                instance,
                propertyKey,
              });
              resourceCount++;
              if (this.options.logging) {
                this.logger.info(`Loaded resource: ${methodMeta.resourceUri}`);
              }
            }
          }
        } catch (error: any) {
          this.logger.error(`Failed to load from ${dir}:`, error.message || error);
          if (this.options.logging) {
            this.logger.error('Full error:', error);
          }
        }
      }
    }

    if (this.options.logging) {
      this.logger.info(`\nLoaded ${toolCount} tools, ${promptCount} prompts, ${resourceCount} resources`);
    }
  }

  async start() {
    await this.loadServices();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    if (this.options.logging) {
      this.logger.info("LeanMCP server running on stdio");
    }
  }

  getServer() {
    return this.server;
  }

  getTools() {
    return Array.from(this.tools.values());
  }

  getPrompts() {
    return Array.from(this.prompts.values());
  }

  getResources() {
    return Array.from(this.resources.values());
  }
}

/**
 * Start MCP server with tools from services directory
 */
export async function startMCPServer(options: MCPServerOptions) {
  const runtime = new MCPServerRuntime(options);
  await runtime.start();
  return runtime;
}
