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
import { getMethodMetadata, getDecoratedMethods } from "./decorators";
import { classToJsonSchemaWithConstraints } from "./schema-generator";

// Schema validator
const ajv = new Ajv();

export interface MCPServerOptions {
  servicesDir: string;
  port?: number;
  cors?: boolean;
  logging?: boolean;
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

  constructor(options: { name: string; version: string; logging?: boolean }) {
    this.logging = options.logging || false;
    this.server = new Server(
      {
        name: options.name,
        version: options.version,
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

      // Execute the method
      try {
        const result = await tool.method.call(tool.instance, request.params.arguments);
        
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
        console.log(`Registered tool: ${methodMeta.toolName}${inputClass ? ' (class-based schema)' : ''}`);
      }
    }

    // Find all @Prompt decorated methods
    const promptMethods = getDecoratedMethods(cls, "prompt:name");
    for (const { method, propertyKey } of promptMethods) {
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
      
      if (this.logging) {
        console.log(`Registered prompt: ${methodMeta.promptName}`);
      }
    }

    // Find all @Resource decorated methods
    const resourceMethods = getDecoratedMethods(cls, "resource:uri");
    for (const { method, propertyKey } of resourceMethods) {
      const methodMeta = getMethodMetadata(method);
      
      // Read mimeType from metadata (set by @Resource decorator)
      const mimeType = (Reflect as any).getMetadata?.("resource:mimeType", method) || "application/json";

      this.resources.set(methodMeta.resourceUri!, {
        uri: methodMeta.resourceUri!,
        name: methodMeta.resourceName || methodMeta.resourceUri!,
        description: methodMeta.resourceDescription || "",
        mimeType: mimeType,
        method,
        instance,
        propertyKey,
      });
      
      if (this.logging) {
        console.log(`Registered resource: ${methodMeta.resourceUri}`);
      }
    }
  }

  /**
   * Get the underlying MCP SDK Server instance
   */
  getServer() {
    return this.server;
  }
}

export class MCPServerRuntime {
  private server: Server;
  private tools: Map<string, RegisteredTool> = new Map();
  private prompts: Map<string, RegisteredPrompt> = new Map();
  private resources: Map<string, RegisteredResource> = new Map();
  private options: MCPServerOptions;

  constructor(options: MCPServerOptions) {
    this.options = options;
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
          console.log(`Auth required for ${toolName} (provider: ${methodMeta.authProvider})`);
        }
      }

      // Execute the method
      try {
        const result = await tool.method.call(tool.instance, request.params.arguments);
        
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
      console.error(`Services directory not found: ${absPath}`);
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
                console.log(`Loaded tool: ${methodMeta.toolName}${inputClass ? ' (class-based schema)' : ''}`);
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
                console.log(`Loaded prompt: ${methodMeta.promptName}`);
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
                console.log(`Loaded resource: ${methodMeta.resourceUri}`);
              }
            }
          }
        } catch (error: any) {
          console.error(`Failed to load from ${dir}:`, error.message || error);
          if (this.options.logging) {
            console.error('Full error:', error);
          }
        }
      }
    }

    if (this.options.logging) {
      console.log(`\nLoaded ${toolCount} tools, ${promptCount} prompts, ${resourceCount} resources`);
    }
  }

  async start() {
    await this.loadServices();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    if (this.options.logging) {
      console.log("LeanMCP server running on stdio");
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
