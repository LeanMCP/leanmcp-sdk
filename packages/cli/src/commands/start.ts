/**
 * leanmcp start command
 *
 * Builds UI components, compiles TypeScript, and starts the production server.
 */
import { spawn } from 'child_process';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { scanUIApp, buildUIComponent, writeUIManifest } from '../vite';
import { logger, chalk } from '../logger';

export async function startCommand() {
  const cwd = process.cwd();

  // Check if this is a LeanMCP project
  if (!(await fs.pathExists(path.join(cwd, 'main.ts')))) {
    logger.error('ERROR: Not a LeanMCP project (main.ts not found).');
    logger.gray('Run this command from your project root.');
    process.exit(1);
  }

  logger.info('\n🚀 LeanMCP Production Build\n');

  // Step 1: Scan for UI components
  const scanSpinner = ora('Scanning for @UIApp components...').start();
  const uiApps = await scanUIApp(cwd);

  if (uiApps.length === 0) {
    scanSpinner.succeed('No @UIApp components found');
  } else {
    scanSpinner.succeed(`Found ${uiApps.length} @UIApp component(s)`);
  }

  // Step 2: Build UI components (production mode)
  const manifest: Record<string, string | { htmlPath: string; isGPTApp?: boolean; gptMeta?: any }> =
    {};

  if (uiApps.length > 0) {
    const buildSpinner = ora('Building UI components...').start();
    const errors: string[] = [];

    for (const app of uiApps) {
      const result = await buildUIComponent(app, cwd, false);
      if (result.success) {
        // Include isGPTApp flag so core uses correct MIME type (text/html+skybridge)
        if (app.isGPTApp) {
          manifest[app.resourceUri] = {
            htmlPath: result.htmlPath,
            isGPTApp: true,
            gptMeta: app.gptOptions,
          };
        } else {
          manifest[app.resourceUri] = result.htmlPath;
        }
      } else {
        errors.push(`${app.componentName}: ${result.error}`);
      }
    }

    // Write manifest for core to auto-register resources
    await writeUIManifest(manifest, cwd);

    if (errors.length > 0) {
      buildSpinner.fail('Build failed');
      for (const error of errors) {
        logger.error(`   ✗ ${error}`);
      }
      process.exit(1);
    }
    buildSpinner.succeed('UI components built');
  }

  // Step 3: Compile TypeScript
  const tscSpinner = ora('Compiling TypeScript...').start();

  try {
    await new Promise<void>((resolve, reject) => {
      const tsc = spawn('npx', ['tsc'], {
        cwd,
        stdio: 'pipe',
        shell: true,
      });

      let stderr = '';
      tsc.stderr?.on('data', (data) => {
        stderr += data;
      });

      tsc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr || `tsc exited with code ${code}`));
      });

      tsc.on('error', reject);
    });

    tscSpinner.succeed('TypeScript compiled');
  } catch (error) {
    tscSpinner.fail('TypeScript compilation failed');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Step 4: Start production server
  logger.info('\nStarting production server...\n');

  const server = spawn('node', ['dist/main.js'], {
    cwd,
    stdio: 'inherit',
    shell: true,
  });

  // Cross-platform graceful shutdown
  // - Windows with shell:true/stdio:inherit: child process automatically receives SIGINT
  // - Unix/Mac/Linux: we may need to forward the signal to the child
  const isWindows = process.platform === 'win32';
  let isCleaningUp = false;

  const cleanup = () => {
    if (isCleaningUp) return;
    isCleaningUp = true;

    logger.gray('\nShutting down...');

    // On non-Windows platforms, explicitly send signal to child process
    // On Windows, child already received SIGINT from the console
    if (!isWindows && !server.killed) {
      server.kill('SIGTERM');
    }
  };

  // Use 'once' to prevent duplicate handlers
  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);

  // Handle child process errors
  server.on('error', (err) => {
    console.error(chalk.red(`Server error: ${err.message}`));
  });

  // Wait for server to exit
  server.on('exit', (code, signal) => {
    // Use setImmediate to ensure event loop can flush on Windows
    setImmediate(() => {
      process.exit(code ?? (signal ? 1 : 0));
    });
  });
}
