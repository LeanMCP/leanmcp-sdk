export const getServiceIndexTemplate = (
  serviceName: string,
  capitalizedName: string
): string => `import { Tool, Resource, Prompt, Optional, SchemaConstraint } from "@leanmcp/core";

// Input schema for greeting
class GreetInput {
  @SchemaConstraint({
    description: "Name to greet",
    minLength: 1
  })
  name!: string;
}

/**
 * ${capitalizedName} Service
 * 
 * This service demonstrates the three types of MCP primitives:
 * - Tools: Callable functions (like API endpoints)
 * - Prompts: Reusable prompt templates
 * - Resources: Data sources/endpoints
 */
export class ${capitalizedName}Service {
  // TOOL - Callable function
  // Tool name: "greet" (from function name)
  @Tool({ 
    description: "Greet a user by name",
    inputClass: GreetInput
  })
  greet(args: GreetInput) {
    return { message: \`Hello, \${args.name}! from ${serviceName}\` };
  }

  // PROMPT - Prompt template
  // Prompt name: "welcomePrompt" (from function name)
  @Prompt({ description: "Welcome message prompt template" })
  welcomePrompt(args: { userName?: string }) {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: \`Welcome \${args.userName || 'user'}! How can I help you with ${serviceName}?\`
          }
        }
      ]
    };
  }

  // RESOURCE - Data endpoint
  // Resource URI auto-generated from class and method name
  @Resource({ description: "${capitalizedName} service status" })
  getStatus() {
    return { 
      service: "${serviceName}", 
      status: "active",
      timestamp: new Date().toISOString()
    };
  }
}
`;
