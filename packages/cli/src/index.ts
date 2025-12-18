import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import ora from "ora";
import { createRequire } from "module";
import { confirm } from "@inquirer/prompts";
import { spawn } from "child_process";
import { devCommand } from "./commands/dev";
import { startCommand } from "./commands/start";
import { loginCommand, logoutCommand, whoamiCommand } from "./commands/login";
import { deployCommand } from "./commands/deploy";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

// Helper function to capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const program = new Command();

program
  .name("leanmcp")
  .description("LeanMCP CLI — create production-ready MCP servers with Streamable HTTP")
  .version(pkg.version)
  .addHelpText(
    "after",
    `
Examples:
  $ leanmcp create my-app --allow-all    # Scaffold without interactive prompts
`
  );

program
  .command("create <projectName>")
  .description("Create a new LeanMCP project with Streamable HTTP transport")
  .option("--allow-all", "Skip interactive confirmations and assume Yes")
  .option("--no-dashboard", "Disable dashboard UI at / and /mcp GET endpoints")
  .action(async (projectName, options) => {
    const spinner = ora(`Creating project ${projectName}...`).start();
    const targetDir = path.join(process.cwd(), projectName);

    if (fs.existsSync(targetDir)) {
      spinner.fail(`Folder ${projectName} already exists.`);
      process.exit(1);
    }

    await fs.mkdirp(targetDir);
    await fs.mkdirp(path.join(targetDir, "mcp", "example"));

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
        "@leanmcp/core": "^0.3.5",
        "dotenv": "^16.5.0"
      },
      devDependencies: {
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
    const dashboardLine = options.dashboard === false ? `\n  dashboard: false,  // Dashboard disabled via --no-dashboard` : '';
    const mainTs = `import dotenv from "dotenv";
import { createHTTPServer } from "@leanmcp/core";

// Load environment variables
dotenv.config();

// Services are automatically discovered from ./mcp directory
await createHTTPServer({
  name: "${projectName}",
  version: "1.0.0",
  port: 3001,
  cors: true,
  logging: true${dashboardLine}
});

console.log("\\n${projectName} MCP Server");
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
    await fs.writeFile(path.join(targetDir, "mcp", "example", "index.ts"), exampleServiceTs);

    const gitignore = `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Diagnostic reports (https://nodejs.org/api/report.html)
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Directory for instrumented libs generated by jscoverage/JSCover
lib-cov

# Coverage directory used by tools like istanbul
coverage
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage (https://gruntjs.com/creating-plugins#storing-task-files)
.grunt

# Bower dependency directory (https://bower.io/)
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons (https://nodejs.org/api/addons.html)
build/Release

# Dependency directories
node_modules/
jspm_packages/

# Snowpack dependency directory (https://snowpack.dev/)
web_modules/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional stylelint cache
.stylelintcache

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variable files
.env
.env.*
!.env.example

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next
out

# Nuxt.js build / generate output
.nuxt
dist
.output

# Gatsby files
.cache/
# Comment in the public line in if your project uses Gatsby and not Next.js
# https://nextjs.org/blog/next-9-1#public-directory-support
# public

# vuepress build output
.vuepress/dist

# vuepress v2.x temp and cache directory
.temp
.cache

# Sveltekit cache directory
.svelte-kit/

# vitepress build output
**/.vitepress/dist

# vitepress cache directory
**/.vitepress/cache

# Docusaurus cache and generated files
.docusaurus

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# Firebase cache directory
.firebase/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# yarn v3
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions

# Vite files
vite.config.js.timestamp-*
vite.config.ts.timestamp-*
.vite/
`;
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
├── mcp/                 # Services directory (auto-discovered)
│   └── example/
│       └── index.ts     # Example service
├── .env                 # Environment variables
└── package.json
\`\`\`

## Adding New Services

Create a new service directory in \`mcp/\`:

\`\`\`typescript
// mcp/myservice/index.ts
import { Tool, SchemaConstraint } from "@leanmcp/core";

// Define input schema
class MyToolInput {
  @SchemaConstraint({ 
    description: "Message to process",
    minLength: 1
  })
  message!: string;
}

export class MyService {
  @Tool({ 
    description: "My awesome tool",
    inputClass: MyToolInput
  })
  async myTool(input: MyToolInput) {
    return {
      content: [{
        type: "text",
        text: \`You said: \${input.message}\`
      }]
    };
  }
}
\`\`\`

Services are automatically discovered and registered - no need to modify \`main.ts\`!

## Features

- **Zero-config auto-discovery** - Services automatically registered from \`./mcp\` directory
- **Type-safe decorators** - \`@Tool\`, \`@Prompt\`, \`@Resource\` with full TypeScript support
- **Schema validation** - Automatic input validation with \`@SchemaConstraint\`
- **HTTP transport** - Production-ready HTTP server with session management
- **Hot reload** - Development mode with automatic restart on file changes

## Testing with MCP Inspector

\`\`\`bash
npx @modelcontextprotocol/inspector http://localhost:3001/mcp
\`\`\`

## License

MIT
`;
    await fs.writeFile(path.join(targetDir, "README.md"), readme);

    spinner.succeed(`Project ${projectName} created!`);
    console.log(chalk.green("\nSuccess! Your MCP server is ready.\n"));
    console.log(chalk.cyan(`Next, navigate to your project:\n  cd ${projectName}\n`));

    // Ask if user wants to install dependencies
    const shouldInstall = options.allowAll
      ? true
      : await confirm({
        message: "Would you like to install dependencies now?",
        default: true
      });

    if (shouldInstall) {
      const installSpinner = ora("Installing dependencies...").start();

      try {
        await new Promise<void>((resolve, reject) => {
          const npmInstall = spawn("npm", ["install"], {
            cwd: targetDir,
            stdio: "pipe",
            shell: true
          });

          npmInstall.on("close", (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`npm install failed with code ${code}`));
            }
          });

          npmInstall.on("error", reject);
        });

        installSpinner.succeed("Dependencies installed successfully!");

        // Ask if user wants to start dev server
        const shouldStartDev = options.allowAll
          ? true
          : await confirm({
            message: "Would you like to start the development server?",
            default: true
          });

        if (shouldStartDev) {
          console.log(chalk.cyan("\nStarting development server...\n"));

          // Start dev server with inherited stdio so user can see output and interact
          const devServer = spawn("npm", ["run", "dev"], {
            cwd: targetDir,
            stdio: "inherit",
            shell: true
          });

          // Handle process termination
          process.on("SIGINT", () => {
            devServer.kill();
            process.exit(0);
          });
        } else {
          console.log(chalk.cyan("\nTo start the development server later:"));
          console.log(chalk.gray(`  cd ${projectName}`));
          console.log(chalk.gray(`  npm run dev`));
        }
      } catch (error) {
        installSpinner.fail("Failed to install dependencies");
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        console.log(chalk.cyan("\nYou can install dependencies manually:"));
        console.log(chalk.gray(`  cd ${projectName}`));
        console.log(chalk.gray(`  npm install`));
      }
    } else {
      console.log(chalk.cyan("\nTo get started:"));
      console.log(chalk.gray(`  cd ${projectName}`));
      console.log(chalk.gray(`  npm install`));
      console.log(chalk.gray(`  npm run dev`));
    }
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

    const serviceDir = path.join(mcpDir, serviceName);
    const serviceFile = path.join(serviceDir, "index.ts");

    if (fs.existsSync(serviceDir)) {
      console.error(chalk.red(`ERROR: Service ${serviceName} already exists.`));
      process.exit(1);
    }

    await fs.mkdirp(serviceDir);

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

    console.log(chalk.green(`\\nCreated new service: ${chalk.bold(serviceName)}`));
    console.log(chalk.gray(`   File: mcp/${serviceName}/index.ts`));
    console.log(chalk.gray(`   Tool: greet`));
    console.log(chalk.gray(`   Prompt: welcomePrompt`));
    console.log(chalk.gray(`   Resource: getStatus`));
    console.log(chalk.green(`\\nService will be automatically discovered on next server start!`));
  });

program
  .command("dev")
  .description("Start development server with UI hot-reload (builds @UIApp components)")
  .action(devCommand);

program
  .command("start")
  .description("Build UI components and start production server")
  .action(startCommand);

// === Cloud Deployment Commands ===

program
  .command("login")
  .description("Authenticate with LeanMCP cloud using an API key")
  .action(loginCommand);

program
  .command("logout")
  .description("Remove stored API key and logout from LeanMCP cloud")
  .action(logoutCommand);

program
  .command("whoami")
  .description("Show current authentication status")
  .action(whoamiCommand);

program
  .command("deploy [folder]")
  .description("Deploy an MCP server to LeanMCP cloud")
  .option("-s, --subdomain <subdomain>", "Subdomain for deployment")
  .option("-y, --yes", "Skip confirmation prompts")
  .action(async (folder, options) => {
    const targetFolder = folder || ".";
    await deployCommand(targetFolder, {
      subdomain: options.subdomain,
      skipConfirm: options.yes,
    });
  });

program.parse();

