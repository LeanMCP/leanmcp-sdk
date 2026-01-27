export const getExampleServiceTemplate = (
  projectName: string
): string => `import { Tool, Resource, Prompt, SchemaConstraint, Optional } from "@leanmcp/core";

    /**
     * ${projectName} - Production-ready MCP server example
     * 
     * This example demonstrates LeanMCP's core features:
     * - Schema validation with decorators
     * - Type-safe tool definitions
     * - Resource and prompt capabilities
     * - Production-ready structure
     */

    // Input schemas with validation decorators
    class CalculateInput {
      @SchemaConstraint({ description: "First number" })
      a!: number;

      @SchemaConstraint({ description: "Second number" })
      b!: number;

      @Optional()
      @SchemaConstraint({
        description: "Operation to perform",
        enum: ["add", "subtract", "multiply", "divide"],
        default: "add"
      })
      operation?: string;
    }

    class EchoInput {
      @SchemaConstraint({
        description: "Message to echo back",
        minLength: 1
      })
      message!: string;
    }

    export class ${projectName}Service {
      // 🧮 CALCULATION TOOL - Shows schema validation
      @Tool({
        description: "Perform arithmetic operations with automatic schema validation",
        inputClass: CalculateInput
      })
      async calculate(input: CalculateInput) {
        const a = Number(input.a);
        const b = Number(input.b);
        let result: number;

        switch (input.operation || "add") {
          case "add":
            result = a + b;
            break;
          case "subtract":
            result = a - b;
            break;
          case "multiply":
            result = a * b;
            break;
          case "divide":
            if (b === 0) throw new Error("Cannot divide by zero");
            result = a / b;
            break;
          default:
            throw new Error("Invalid operation");
        }

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              operation: input.operation || "add",
              operands: { a: input.a, b: input.b },
              result,
              timestamp: new Date().toISOString(),
              server: "${projectName}"
            }, null, 2)
          }]
        };
      }

      // 💬 ECHO TOOL - Shows basic functionality
      @Tool({
        description: "Echo a message back with timestamp",
        inputClass: EchoInput
      })
      async echo(input: EchoInput) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              echoed: input.message,
              timestamp: new Date().toISOString(),
              server: "${projectName}"
            }, null, 2)
          }]
        };
      }

      // 📊 SERVER INFO RESOURCE - Shows resource capabilities
      @Resource({ description: "Get server information and health status" })
      async serverInfo() {
        return {
          contents: [{
            uri: "server://info",
            mimeType: "application/json",
            text: JSON.stringify({
              name: "${projectName}",
              version: "1.0.0",
              status: "healthy",
              uptime: Math.floor(process.uptime()),
              memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
              },
              features: [
                "Schema validation with decorators",
                "Type-safe tool definitions", 
                "Resource endpoints",
                "Prompt templates"
              ],
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }

      // 🎯 WELCOME PROMPT - Shows prompt capabilities
      @Prompt({ description: "Generate a welcome prompt for the server" })
      async welcome(args: { name?: string }) {
        return {
          messages: [{
            role: "user" as const,
            content: {
              type: "text" as const,
              text: \`Welcome \${args.name || 'there'} to ${projectName}! 

🎉 Your MCP server is running with these tools:
- calculate: Perform arithmetic operations
- echo: Echo messages back
- serverInfo: Get server status and information

Try calling these tools to see LeanMCP in action!\`
            }
          }]
        };
      }
    }
`;
