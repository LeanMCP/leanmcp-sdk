#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import ora from "ora";

// Helper function to capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const program = new Command();

program
  .name("leanmcp")
  .description("LeanMCP CLI — create production-ready MCP servers with Streamable HTTP")
  .version("0.1.0");

program
  .command("create <projectName>")
  .description("Create a new LeanMCP project with Streamable HTTP transport")
  .action(async (projectName) => {
    const spinner = ora(`Creating project ${projectName}...`).start();
    const targetDir = path.join(process.cwd(), projectName);

    if (fs.existsSync(targetDir)) {
      spinner.fail(`Folder ${projectName} already exists.`);
      process.exit(1);
    }

    await fs.mkdirp(targetDir);
    await fs.mkdirp(path.join(targetDir, "mcp"));

    // --- Package.json ---
    const pkg = {
      name: projectName,
      version: "1.0.0",
      description: "MCP Server with Streamable HTTP Transport and LeanMCP SDK",
      main: "dist/main.js",
      type: "module",
      scripts: {
        dev: "tsx watch main.ts",
        build: "tsc",
        start: "node dist/main.js",
        clean: "rm -rf dist"
      },
      keywords: ["mcp", "model-context-protocol", "streamable-http", "leanmcp"],
      author: "",
      license: "MIT",
      dependencies: {
        "@leanmcp/core": "^0.1.0",
        "@modelcontextprotocol/sdk": "^1.0.0",
        "cors": "^2.8.5",
        "dotenv": "^16.5.0",
        "express": "^5.1.0"
      },
      devDependencies: {
        "@types/cors": "^2.8.19",
        "@types/express": "^5.0.3",
        "@types/node": "^20.0.0",
        "tsx": "^4.20.3",
        "typescript": "^5.6.3"
      }
    };
    await fs.writeJSON(path.join(targetDir, "package.json"), pkg, { spaces: 2 });

    // --- TypeScript Config ---
    const tsconfig = {
      compilerOptions: {
        module: "ESNext",
        target: "ES2022",
        moduleResolution: "Node",
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
        outDir: "dist",
        experimentalDecorators: true,
        emitDecoratorMetadata: true
      },
      include: ["**/*.ts"],
      exclude: ["node_modules", "dist"]
    };
    await fs.writeJSON(path.join(targetDir, "tsconfig.json"), tsconfig, { spaces: 2 });

    // --- Main Entry Point (main.ts) ---
    const mainTs = `import dotenv from "dotenv";
import { createHTTPServer, MCPServer } from "@leanmcp/core";
import { ExampleService } from "./mcp/example.js";

// Load environment variables
dotenv.config();

const PORT = Number(process.env.PORT) || 3001;

/**
 * Create and configure the MCP server
 */
function createMCPServer() {
  const server = new MCPServer({ 
    name: "${projectName}", 
    version: "1.0.0" 
  });

  // Register your services here
  server.registerService(new ExampleService());

  return server.getServer();
}

// Start the HTTP server
await createHTTPServer(createMCPServer, {
  port: PORT,
  cors: true,
  logging: true
});
`;
    await fs.writeFile(path.join(targetDir, "main.ts"), mainTs);

    // Create an example service file
    const exampleServiceTs = `import { Tool, Resource, Prompt, SchemaConstraint, Optional } from "@leanmcp/core";

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

export class ExampleService {
  @Tool({ 
    description: "Perform arithmetic operations with automatic schema validation",
    inputClass: CalculateInput
  })
  async calculate(input: CalculateInput) {
    let result: number;
    
    switch (input.operation || "add") {
      case "add":
        result = input.a + input.b;
        break;
      case "subtract":
        result = input.a - input.b;
        break;
      case "multiply":
        result = input.a * input.b;
        break;
      case "divide":
        if (input.b === 0) throw new Error("Cannot divide by zero");
        result = input.a / input.b;
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

  @Tool({ description: "Echo a message back" })
  async echo(input: { message: string }) {
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
    await fs.writeFile(path.join(targetDir, "mcp", "example.ts"), exampleServiceTs);

    const gitignore = `node_modules\ndist\n.env\n.env.local\n*.log\n`;
    const env = `# Server Configuration\nPORT=3001\nNODE_ENV=development\n\n# Add your environment variables here\n`;

    await fs.writeFile(path.join(targetDir, ".gitignore"), gitignore);
    await fs.writeFile(path.join(targetDir, ".env"), env);

    // --- README ---
    const readme = `# ${projectName}

MCP Server with Streamable HTTP Transport built with LeanMCP SDK

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Start development server (hot reload)
npm run dev

# Build for production
npm run build

# Run production server
npm start
\`\`\`

## Project Structure

\`\`\`
${projectName}/
├── main.ts              # Server entry point
├── mcp/
│   └── example.ts       # Example service
├── .env                 # Environment variables
└── package.json
\`\`\`

## Adding New Services

Create a new service file in \`mcp/\`:

\`\`\`typescript
import { Tool } from "@leanmcp/core";

export class MyService {
  @Tool({ description: "My awesome tool" })
  async myTool(input: { message: string }) {
    return {
      content: [{
        type: "text",
        text: \`You said: \${input.message}\`
      }]
    };
  }
}
\`\`\`

Then register it in \`main.ts\`:

\`\`\`typescript
import { MyService } from "./mcp/my-service.js";
server.registerService(new MyService());
\`\`\`

## Testing with MCP Inspector

\`\`\`bash
npx @modelcontextprotocol/inspector http://localhost:3001/mcp
\`\`\`

## License

MIT
`;
    await fs.writeFile(path.join(targetDir, "README.md"), readme);

    spinner.succeed(`Project ${projectName} created!`);
    console.log(chalk.green("\\nSuccess! Your MCP server is ready.\\n"));
    console.log(chalk.cyan("Next steps:"));
    console.log(chalk.gray(`  cd ${projectName}`));
    console.log(chalk.gray(`  npm install`));
    console.log(chalk.gray(`  npm run dev`));
    console.log(chalk.gray(`\\nServer will run on http://localhost:3001`));
  });

program
  .command("add <serviceName>")
  .description("Add a new MCP service to your project")
  .action(async (serviceName) => {
    const cwd = process.cwd();
    const mcpDir = path.join(cwd, "mcp");
    
    if (!fs.existsSync(path.join(cwd, "main.ts"))) {
      console.error(chalk.red("ERROR: Not a LeanMCP project (main.ts missing)."));
      process.exit(1);
    }

    await fs.mkdirp(mcpDir);
    const serviceFile = path.join(mcpDir, `${serviceName}.ts`);
    
    if (fs.existsSync(serviceFile)) {
      console.error(chalk.red(`ERROR: Service ${serviceName} already exists.`));
      process.exit(1);
    }

    const indexTs = `import { Tool, Resource, Prompt, Optional, SchemaConstraint } from "@leanmcp/core";

// Input schema for greeting
class GreetInput {
  @SchemaConstraint({
    description: "Name to greet",
    minLength: 1
  })
  name!: string;
}

/**
 * ${capitalize(serviceName)} Service
 * 
 * This service demonstrates the three types of MCP primitives:
 * - Tools: Callable functions (like API endpoints)
 * - Prompts: Reusable prompt templates
 * - Resources: Data sources/endpoints
 */
export class ${capitalize(serviceName)}Service {
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
  @Resource({ description: "${capitalize(serviceName)} service status" })
  getStatus() {
    return { 
      service: "${serviceName}", 
      status: "active",
      timestamp: new Date().toISOString()
    };
  }
}
`;
    await fs.writeFile(serviceFile, indexTs);
    
    // Auto-register the service in main.ts
    const mainTsPath = path.join(cwd, "main.ts");
    let mainTsContent = await fs.readFile(mainTsPath, "utf-8");
    
    const serviceClassName = `${capitalize(serviceName)}Service`;
    const importStatement = `import { ${serviceClassName} } from "./mcp/${serviceName}.js";`;
    const registerStatement = `  server.registerService(new ${serviceClassName}());`;
    
    // Add import after the last import statement
    const lastImportMatch = mainTsContent.match(/import .* from .*;\n/g);
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      const lastImportIndex = mainTsContent.lastIndexOf(lastImport);
      const afterLastImport = lastImportIndex + lastImport.length;
      mainTsContent = 
        mainTsContent.slice(0, afterLastImport) + 
        importStatement + "\n" + 
        mainTsContent.slice(afterLastImport);
    }
    
    // Add registration after existing registerService calls
    const registerPattern = /server\.registerService\(new \w+\(\)\);/g;
    const matches = [...mainTsContent.matchAll(registerPattern)];
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const insertPosition = lastMatch.index! + lastMatch[0].length;
      mainTsContent = 
        mainTsContent.slice(0, insertPosition) + 
        "\n" + registerStatement + 
        mainTsContent.slice(insertPosition);
    }
    
    await fs.writeFile(mainTsPath, mainTsContent);
    
    console.log(chalk.green(`\\nCreated new service: ${chalk.bold(serviceName)}`));
    console.log(chalk.gray(`   File: mcp/${serviceName}.ts`));
    console.log(chalk.gray(`   Tool: greet`));
    console.log(chalk.gray(`   Prompt: welcomePrompt`));
    console.log(chalk.gray(`   Resource: getStatus`));
    console.log(chalk.green(`\\nService automatically registered in main.ts!`));
  });

program.parse();
