import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { createRequire } from 'module';
import { confirm } from '@inquirer/prompts';
import { spawn } from 'child_process';
import { devCommand } from './commands/dev';
import { buildCommand } from './commands/build';
import { startCommand } from './commands/start';
import {
  loginCommand,
  logoutCommand,
  whoamiCommand,
  setDebugMode as setLoginDebugMode,
} from './commands/login';
import { deployCommand, setDeployDebugMode } from './commands/deploy';
import { sendFeedbackCommand } from './commands/feedback';
import {
  projectsListCommand,
  projectsGetCommand,
  projectsDeleteCommand,
} from './commands/projects';
import {
  envListCommand,
  envSetCommand,
  envGetCommand,
  envRemoveCommand,
  envPullCommand,
  envPushCommand,
  setEnvDebugMode,
} from './commands/env';
import { getReadmeTemplate } from './templates/readme_v1';
import { gitignoreTemplate } from './templates/gitignore_v1';
import { getExampleServiceTemplate } from './templates/example_service_v1';
import { getMainTsTemplate } from './templates/main_ts_v1';
import { getServiceIndexTemplate } from './templates/service_index_v1';
import {
  getPythonMainTemplate,
  getPythonRequirementsTemplate,
  pythonGitignoreTemplate,
  getPythonReadmeTemplate,
} from './templates/python';
import { trackCommand, logger, chalk, setDebugMode, debug } from './logger';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

// Helper function to capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const program = new Command();

// Enable global debug mode based on --debug flag
function enableDebugIfNeeded() {
  const args = process.argv;
  if (args.includes('--debug') || args.includes('-d')) {
    setDebugMode(true);
    setLoginDebugMode(true);
    setDeployDebugMode(true);
    setEnvDebugMode(true);
    debug('Debug mode enabled globally');
  }
}

// Call early to enable debug mode before any command runs
enableDebugIfNeeded();

program
  .name('leanmcp')
  .description('LeanMCP CLI — create production-ready MCP servers with Streamable HTTP')
  .version(pkg.version, '-v, --version', 'Output the current version')
  .helpOption('-h, --help', 'Display help for command')
  .option('-d, --debug', 'Enable debug logging for all commands')
  .addHelpText(
    'after',
    `
Examples:
  $ leanmcp create my-app                # Create new TypeScript project (interactive)
  $ leanmcp create my-app --python       # Create new Python project
  $ leanmcp create my-app -i             # Create and install deps (non-interactive)
  $ leanmcp create my-app --no-install   # Create without installing deps
  $ leanmcp dev                          # Start development server
  $ leanmcp build                        # Build UI components and compile TypeScript
  $ leanmcp start                        # Build and start production server
  $ leanmcp login                        # Authenticate with LeanMCP cloud
  $ leanmcp deploy ./my-app              # Deploy to LeanMCP cloud
  $ leanmcp projects list                # List your cloud projects
  $ leanmcp projects delete <id>         # Delete a cloud project
  $ leanmcp env list                     # List environment variables
  $ leanmcp env set KEY=VALUE            # Set an environment variable

Global Options:
  -v, --version    Output the current version
  -h, --help       Display help for command
  -d, --debug      Enable debug logging for all commands
`
  );

program
  .command('create <projectName>')
  .description('Create a new LeanMCP project with Streamable HTTP transport')
  .option('--allow-all', 'Skip interactive confirmations and assume Yes')
  .option('--no-dashboard', 'Disable dashboard UI at / and /mcp GET endpoints')
  .option('-i, --install', 'Install dependencies automatically (non-interactive, no dev server)')
  .option('--no-install', 'Skip dependency installation (non-interactive)')
  .option('--python', 'Create a Python MCP project instead of TypeScript')
  .action(async (projectName, options) => {
    trackCommand('create', { projectName, ...options });
    const spinner = ora(`Creating project ${projectName}...`).start();
    const targetDir = path.join(process.cwd(), projectName);

    if (fs.existsSync(targetDir)) {
      spinner.fail(`Folder ${projectName} already exists.`);
      process.exit(1);
    }

    await fs.mkdirp(targetDir);

    const isPython = options.python === true;

    if (isPython) {
      // === PYTHON PROJECT ===

      // --- requirements.txt ---
      const requirements = getPythonRequirementsTemplate();
      await fs.writeFile(path.join(targetDir, 'requirements.txt'), requirements);

      // --- Main Entry Point (main.py) - includes example tools/resources/prompts ---
      const mainPy = getPythonMainTemplate(projectName);
      await fs.writeFile(path.join(targetDir, 'main.py'), mainPy);

      // --- .gitignore ---
      await fs.writeFile(path.join(targetDir, '.gitignore'), pythonGitignoreTemplate);

      // --- .env ---
      const env = `# Server Configuration\nPORT=3001\n\n# Add your environment variables here\n`;
      await fs.writeFile(path.join(targetDir, '.env'), env);

      // --- README ---
      const readme = getPythonReadmeTemplate(projectName);
      await fs.writeFile(path.join(targetDir, 'README.md'), readme);
    } else {
      // === TYPESCRIPT PROJECT ===
      await fs.mkdirp(path.join(targetDir, 'mcp', 'example'));

      // --- Package.json ---
      const pkg = {
        name: projectName,
        version: '1.0.0',
        description: 'MCP Server with Streamable HTTP Transport and LeanMCP SDK',
        main: 'dist/main.js',
        type: 'module',
        scripts: {
          dev: 'leanmcp dev',
          build: 'leanmcp build',
          start: 'leanmcp start',
          inspect: 'npx @modelcontextprotocol/inspector node dist/main.js',
          'start:node': 'node dist/main.js',
          clean: 'rm -rf dist',
        },
        keywords: ['mcp', 'model-context-protocol', 'streamable-http', 'leanmcp'],
        author: '',
        license: 'MIT',
        dependencies: {
          '@leanmcp/core': '^0.3.14',
          '@leanmcp/ui': '^0.2.1',
          '@leanmcp/auth': '^0.4.0',
          dotenv: '^16.5.0',
        },
        devDependencies: {
          '@leanmcp/cli': '^0.4.0',
          '@types/node': '^20.0.0',
          tsx: '^4.20.3',
          typescript: '^5.6.3',
        },
      };
      await fs.writeJSON(path.join(targetDir, 'package.json'), pkg, { spaces: 2 });

      // --- TypeScript Config ---
      const tsconfig = {
        compilerOptions: {
          module: 'ESNext',
          target: 'ES2022',
          moduleResolution: 'Node',
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          outDir: 'dist',
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
        include: ['**/*.ts'],
        exclude: ['node_modules', 'dist'],
      };
      await fs.writeJSON(path.join(targetDir, 'tsconfig.json'), tsconfig, { spaces: 2 });

      // --- Main Entry Point (main.ts) ---
      const dashboardLine =
        options.dashboard === false
          ? `\n  dashboard: false,  // Dashboard disabled via --no-dashboard`
          : '';
      const mainTs = getMainTsTemplate(projectName, dashboardLine);
      await fs.writeFile(path.join(targetDir, 'main.ts'), mainTs);

      // Create an example service file
      const exampleServiceTs = getExampleServiceTemplate(projectName);
      await fs.writeFile(path.join(targetDir, 'mcp', 'example', 'index.ts'), exampleServiceTs);

      const gitignore = gitignoreTemplate;
      const env = `# Server Configuration\nPORT=3001\nNODE_ENV=development\n\n# Add your environment variables here\n`;

      await fs.writeFile(path.join(targetDir, '.gitignore'), gitignore);
      await fs.writeFile(path.join(targetDir, '.env'), env);

      // --- README ---
      const readme = getReadmeTemplate(projectName);
      await fs.writeFile(path.join(targetDir, 'README.md'), readme);
    }

    spinner.succeed(`Project ${projectName} created!`);
    logger.log('\nSuccess! Your MCP server is ready.\n', chalk.green);
    logger.log('To deploy to LeanMCP cloud:', chalk.cyan);
    logger.log(`  cd ${projectName}`, chalk.gray);
    logger.log(`  leanmcp deploy .\n`, chalk.gray);
    logger.log('Need help? Join our Discord:', chalk.cyan);
    logger.log('  https://discord.com/invite/DsRcA3GwPy\n', chalk.blue);

    // Determine install behavior based on flags
    // --no-install: Skip install entirely (non-interactive)
    // --install: Install but don't start dev server (non-interactive)
    // --allow-all: Install and start dev server (non-interactive)
    // default: Interactive prompts

    const isNonInteractive = options.install !== undefined || options.allowAll;

    // If --no-install flag is set (options.install === false), skip entirely
    if (options.install === false) {
      logger.log('To get started:', chalk.cyan);
      logger.log(`  cd ${projectName}`, chalk.gray);
      if (isPython) {
        logger.log(`  python -m venv venv`, chalk.gray);
        logger.log(`  source venv/bin/activate  # On Windows: venv\\Scripts\\activate`, chalk.gray);
        logger.log(`  pip install -r requirements.txt`, chalk.gray);
        logger.log(`  python main.py`, chalk.gray);
      } else {
        logger.log(`  npm install`, chalk.gray);
        logger.log(`  npm run dev`, chalk.gray);
      }
      logger.log('');
      logger.log('To deploy to LeanMCP cloud:', chalk.cyan);
      logger.log(`  cd ${projectName}`, chalk.gray);
      logger.log(`  leanmcp deploy .`, chalk.gray);
      return;
    }

    // For Python projects, skip automatic install (requires venv setup)
    if (isPython) {
      logger.log('\nTo get started:', chalk.cyan);
      logger.log(`  cd ${projectName}`, chalk.gray);
      logger.log(`  python -m venv venv`, chalk.gray);
      logger.log(`  source venv/bin/activate  # On Windows: venv\\Scripts\\activate`, chalk.gray);
      logger.log(`  pip install -r requirements.txt`, chalk.gray);
      logger.log(`  python main.py`, chalk.gray);
      logger.log('');
      logger.log('To deploy to LeanMCP cloud:', chalk.cyan);
      logger.log(`  cd ${projectName}`, chalk.gray);
      logger.log(`  leanmcp deploy .`, chalk.gray);
      return;
    }

    // === TypeScript/Node.js install flow ===
    // Ask if user wants to install dependencies (unless non-interactive)
    const shouldInstall = isNonInteractive
      ? true
      : await confirm({
          message: 'Would you like to install dependencies now?',
          default: true,
        });

    if (shouldInstall) {
      const installSpinner = ora('Installing dependencies...').start();

      try {
        await new Promise<void>((resolve, reject) => {
          const npmInstall = spawn('npm', ['install'], {
            cwd: targetDir,
            stdio: 'pipe',
            shell: true,
          });

          npmInstall.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`npm install failed with code ${code}`));
            }
          });

          npmInstall.on('error', reject);
        });

        installSpinner.succeed('Dependencies installed successfully!');

        // If --install flag was used, exit without starting dev server
        if (options.install === true) {
          logger.log('\nTo start the development server:', chalk.cyan);
          logger.log(`  cd ${projectName}`, chalk.gray);
          logger.log(`  npm run dev`, chalk.gray);
          logger.log('');
          logger.log('To deploy to LeanMCP cloud:', chalk.cyan);
          logger.log(`  cd ${projectName}`, chalk.gray);
          logger.log(`  leanmcp deploy .`, chalk.gray);
          return;
        }

        // Ask if user wants to start dev server (unless --allow-all)
        const shouldStartDev = options.allowAll
          ? true
          : await confirm({
              message: 'Would you like to start the development server?',
              default: true,
            });

        if (shouldStartDev) {
          logger.log('\nStarting development server...\n', chalk.cyan);

          // Start dev server with inherited stdio so user can see output and interact
          const devServer = spawn('npm', ['run', 'dev'], {
            cwd: targetDir,
            stdio: 'inherit',
            shell: true,
          });

          // Handle process termination
          process.on('SIGINT', () => {
            devServer.kill();
            process.exit(0);
          });
        } else {
          logger.log('\nTo start the development server later:', chalk.cyan);
          logger.log(`  cd ${projectName}`, chalk.gray);
          logger.log(`  npm run dev`, chalk.gray);
          logger.log('');
          logger.log('To deploy to LeanMCP cloud:', chalk.cyan);
          logger.log(`  cd ${projectName}`, chalk.gray);
          logger.log(`  leanmcp deploy .`, chalk.gray);
        }
      } catch (error) {
        installSpinner.fail('Failed to install dependencies');
        logger.log(error instanceof Error ? error.message : String(error), chalk.red);
        logger.log('\nYou can install dependencies manually:', chalk.cyan);
        logger.log(`  cd ${projectName}`, chalk.gray);
        logger.log(`  npm install`, chalk.gray);
      }
    } else {
      logger.log('\nTo get started:', chalk.cyan);
      logger.log(`  cd ${projectName}`, chalk.gray);
      logger.log(`  npm install`, chalk.gray);
      logger.log(`  npm run dev`, chalk.gray);
      logger.log('');
      logger.log('To deploy to LeanMCP cloud:', chalk.cyan);
      logger.log(`  cd ${projectName}`, chalk.gray);
      logger.log(`  leanmcp deploy .`, chalk.gray);
      logger.log('\nSend us feedback:', chalk.cyan);
      logger.log('  leanmcp send-feedback "Great tool!"\n', chalk.gray);
    }
  });

program
  .command('send-feedback [message]')
  .description('Send feedback to the LeanMCP team')
  .option('--anon', 'Send feedback anonymously')
  .option('--include-logs', 'Include local log files with feedback')
  .action(async (message, options) => {
    trackCommand('send-feedback', { hasMessage: !!message, ...options });
    await sendFeedbackCommand(message, options);
  });

program
  .command('add <serviceName>')
  .description('Add a new MCP service to your project')
  .action(async (serviceName) => {
    const cwd = process.cwd();
    const mcpDir = path.join(cwd, 'mcp');

    if (!fs.existsSync(path.join(cwd, 'main.ts'))) {
      logger.log('ERROR: Not a LeanMCP project (main.ts missing).', chalk.red);
      process.exit(1);
    }

    const serviceDir = path.join(mcpDir, serviceName);
    const serviceFile = path.join(serviceDir, 'index.ts');

    if (fs.existsSync(serviceDir)) {
      logger.log(`ERROR: Service ${serviceName} already exists.`, chalk.red);
      process.exit(1);
    }

    await fs.mkdirp(serviceDir);

    const indexTs = getServiceIndexTemplate(serviceName, capitalize(serviceName));
    await fs.writeFile(serviceFile, indexTs);

    logger.log(`\\nCreated new service: ${chalk.bold(serviceName)}`, chalk.green);
    logger.log(`   File: mcp/${serviceName}/index.ts`, chalk.gray);
    logger.log(`   Tool: greet`, chalk.gray);
    logger.log(`   Prompt: welcomePrompt`, chalk.gray);
    logger.log(`   Resource: getStatus`, chalk.gray);
    logger.log(`\\nService will be automatically discovered on next server start!`, chalk.green);
  });

program
  .command('dev')
  .description('Start development server with UI hot-reload (builds @UIApp components)')
  .action(() => {
    trackCommand('dev');
    devCommand();
  });

program
  .command('build')
  .description('Build UI components and compile TypeScript for production')
  .action(() => {
    trackCommand('build');
    buildCommand();
  });

program
  .command('start')
  .description('Build UI components and start production server')
  .action(() => {
    trackCommand('start');
    startCommand();
  });

// === Cloud Deployment Commands ===

program
  .command('login')
  .description('Authenticate with LeanMCP cloud using an API key')
  .action(async () => {
    trackCommand('login');
    await loginCommand();
  });

program
  .command('logout')
  .description('Remove stored API key and logout from LeanMCP cloud')
  .action(() => {
    trackCommand('logout');
    logoutCommand();
  });

program
  .command('whoami')
  .description('Show current authentication status')
  .action(() => {
    trackCommand('whoami');
    whoamiCommand();
  });

program
  .command('deploy [folder]')
  .description('Deploy an MCP server to LeanMCP cloud')
  .option('-s, --subdomain <subdomain>', 'Subdomain for deployment')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (folder, options) => {
    trackCommand('deploy', { folder, subdomain: options.subdomain, yes: options.yes });
    const targetFolder = folder || '.';
    await deployCommand(targetFolder, {
      subdomain: options.subdomain,
      skipConfirm: options.yes,
    });
  });

// === Projects Management Commands ===

const projectsCmd = program.command('projects').description('Manage LeanMCP cloud projects');

projectsCmd
  .command('list')
  .alias('ls')
  .description('List all your projects')
  .action(() => {
    trackCommand('projects_list');
    projectsListCommand();
  });

projectsCmd
  .command('get <projectId>')
  .description('Get details of a specific project')
  .action((projectId) => {
    trackCommand('projects_get', { projectId });
    projectsGetCommand(projectId);
  });

projectsCmd
  .command('delete <projectId>')
  .alias('rm')
  .description('Delete a project')
  .option('-f, --force', 'Skip confirmation prompt')
  .action((projectId, options) => {
    trackCommand('projects_delete', { projectId, force: options.force });
    projectsDeleteCommand(projectId, options);
  });

// === Environment Variable Commands ===

const envCmd = program
  .command('env')
  .description('Manage environment variables for deployed projects');

envCmd
  .command('list [folder]')
  .alias('ls')
  .description('List all environment variables')
  .option('--reveal', 'Show actual values instead of masked')
  .option('--project-id <id>', 'Specify project ID')
  .action((folder, options) => {
    trackCommand('env_list', { folder, ...options });
    envListCommand(folder || '.', options);
  });

envCmd
  .command('set <keyValue> [folder]')
  .description('Set an environment variable (KEY=VALUE)')
  .option('-f, --file <file>', 'Load from env file')
  .option('--force', 'Skip confirmation for reserved keys')
  .action((keyValue, folder, options) => {
    trackCommand('env_set', { folder, ...options });
    envSetCommand(keyValue, folder || '.', options);
  });

envCmd
  .command('get <key> [folder]')
  .description('Get an environment variable value')
  .option('--reveal', 'Show actual value')
  .action((key, folder, options) => {
    trackCommand('env_get', { key, folder, ...options });
    envGetCommand(key, folder || '.', options);
  });

envCmd
  .command('remove <key> [folder]')
  .alias('rm')
  .description('Remove an environment variable')
  .option('--force', 'Skip confirmation')
  .action((key, folder, options) => {
    trackCommand('env_remove', { key, folder, ...options });
    envRemoveCommand(key, folder || '.', options);
  });

envCmd
  .command('pull [folder]')
  .description('Download environment variables to local .env file')
  .option('-f, --file <file>', 'Output file', '.env.remote')
  .action((folder, options) => {
    trackCommand('env_pull', { folder, ...options });
    envPullCommand(folder || '.', options);
  });

envCmd
  .command('push [folder]')
  .description('Upload environment variables from local .env file (replaces all)')
  .option('-f, --file <file>', 'Input file', '.env')
  .option('--force', 'Skip confirmation')
  .action((folder, options) => {
    trackCommand('env_push', { folder, ...options });
    envPushCommand(folder || '.', options);
  });

program.parse();
