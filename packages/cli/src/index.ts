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
import { loginCommand, logoutCommand, whoamiCommand, setDebugMode } from "./commands/login";
import { deployCommand, setDeployDebugMode } from "./commands/deploy";
import { projectsListCommand, projectsGetCommand, projectsDeleteCommand } from "./commands/projects";
import { getReadmeTemplate } from "./templates/readme_v1";
import { gitignoreTemplate } from "./templates/gitignore_v1";
import { getExampleServiceTemplate } from "./templates/example_service_v1";

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
  $ leanmcp create my-app                # Create new project (interactive)
  $ leanmcp create my-app --install      # Create and install deps (non-interactive)
  $ leanmcp create my-app --no-install   # Create without installing deps
  $ leanmcp dev                          # Start development server
  $ leanmcp login                        # Authenticate with LeanMCP cloud
  $ leanmcp deploy ./my-app              # Deploy to LeanMCP cloud
  $ leanmcp projects list                # List your cloud projects
  $ leanmcp projects delete <id>         # Delete a cloud project
`
  );

program
  .command("create <projectName>")
  .description("Create a new LeanMCP project with Streamable HTTP transport")
  .option("--allow-all", "Skip interactive confirmations and assume Yes")
  .option("--no-dashboard", "Disable dashboard UI at / and /mcp GET endpoints")
  .option("--install", "Install dependencies automatically (non-interactive, no dev server)")
  .option("--no-install", "Skip dependency installation (non-interactive)")
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
    const exampleServiceTs = getExampleServiceTemplate(projectName);
    await fs.writeFile(path.join(targetDir, "mcp", "example", "index.ts"), exampleServiceTs);

    const gitignore = gitignoreTemplate;
    const env = `# Server Configuration\nPORT=3001\nNODE_ENV=development\n\n# Add your environment variables here\n`;

    await fs.writeFile(path.join(targetDir, ".gitignore"), gitignore);
    await fs.writeFile(path.join(targetDir, ".env"), env);

    // --- README ---
    const readme = getReadmeTemplate(projectName);
    await fs.writeFile(path.join(targetDir, "README.md"), readme);

    spinner.succeed(`Project ${projectName} created!`);
    console.log(chalk.green("\nSuccess! Your MCP server is ready.\n"));
    console.log(chalk.cyan(`Next, navigate to your project:\n  cd ${projectName}\n`));

    // Determine install behavior based on flags
    // --no-install: Skip install entirely (non-interactive)
    // --install: Install but don't start dev server (non-interactive)
    // --allow-all: Install and start dev server (non-interactive)
    // default: Interactive prompts
    
    const isNonInteractive = options.install !== undefined || options.allowAll;
    
    // If --no-install flag is set (options.install === false), skip entirely
    if (options.install === false) {
      console.log(chalk.cyan("\nTo get started:"));
      console.log(chalk.gray(`  cd ${projectName}`));
      console.log(chalk.gray(`  npm install`));
      console.log(chalk.gray(`  npm run dev`));
      return;
    }

    // Ask if user wants to install dependencies (unless non-interactive)
    const shouldInstall = isNonInteractive
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

        // If --install flag was used, exit without starting dev server
        if (options.install === true) {
          console.log(chalk.cyan("\nTo start the development server:"));
          console.log(chalk.gray(`  cd ${projectName}`));
          console.log(chalk.gray(`  npm run dev`));
          return;
        }

        // Ask if user wants to start dev server (unless --allow-all)
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
  .option("--debug", "Enable debug logging")
  .action(async (options) => {
    if (options.debug) {
      setDebugMode(true);
    }
    await loginCommand();
  });

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
  .option("--debug", "Enable debug logging for network calls")
  .action(async (folder, options) => {
    if (options.debug) {
      setDebugMode(true);
      setDeployDebugMode(true);
    }
    const targetFolder = folder || ".";
    await deployCommand(targetFolder, {
      subdomain: options.subdomain,
      skipConfirm: options.yes,
    });
  });

// === Projects Management Commands ===

const projectsCmd = program
  .command("projects")
  .description("Manage LeanMCP cloud projects");

projectsCmd
  .command("list")
  .alias("ls")
  .description("List all your projects")
  .action(projectsListCommand);

projectsCmd
  .command("get <projectId>")
  .description("Get details of a specific project")
  .action(projectsGetCommand);

projectsCmd
  .command("delete <projectId>")
  .alias("rm")
  .description("Delete a project")
  .option("-f, --force", "Skip confirmation prompt")
  .action((projectId, options) => projectsDeleteCommand(projectId, options));

program.parse();

