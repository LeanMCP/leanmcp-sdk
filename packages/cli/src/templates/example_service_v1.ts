export const getExampleServiceTemplate = (projectName: string): string => `import { Tool, Resource, Prompt, SchemaConstraint, Optional } from "@leanmcp/core";

    /**
     * Example service demonstrating LeanMCP SDK decorators
     * 
     * This is a simple example to get you started. Add your own tools, resources, and prompts here!
     */

    // Input schema with validation decorators
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

    export class ExampleService {
      @Tool({
        description: "Perform arithmetic operations with automatic schema validation",
        inputClass: CalculateInput
      })
      async calculate(input: CalculateInput) {
        // Ensure numerical operations by explicitly converting to numbers
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
              result
            }, null, 2)
          }]
        };
      }

      @Tool({
        description: "Echo a message back",
        inputClass: EchoInput
      })
      async echo(input: EchoInput) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              echoed: input.message,
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }

      @Resource({ description: "Get server information" })
      async serverInfo() {
        return {
          contents: [{
            uri: "server://info",
            mimeType: "application/json",
            text: JSON.stringify({
              name: "${projectName}",
              version: "1.0.0",
              uptime: process.uptime()
            }, null, 2)
          }]
        };
      }

      @Prompt({ description: "Generate a greeting prompt" })
      async greeting(args: { name?: string }) {
        return {
          messages: [{
            role: "user" as const,
            content: {
              type: "text" as const,
              text: \`Hello \${args.name || 'there'}! Welcome to ${projectName}.\`
        }
      }]
    };
  }
}
`;
