/**
 * leanmcp build command
 *
 * Builds UI components and compiles TypeScript for production deployment.
 * Does NOT start the server - use 'leanmcp start' or 'node dist/main.js' after building.
 */
import { spawn } from 'child_process';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '../logger';
import { scanUIApp, buildUIComponent, writeUIManifest } from '../vite';
import { generateSchemaMetadata } from '../schema-extractor';

export async function buildCommand() {
  const cwd = process.cwd();

  // Check if this is a LeanMCP project
  if (!(await fs.pathExists(path.join(cwd, 'main.ts')))) {
    logger.error('ERROR: Not a LeanMCP project (main.ts not found).');
    logger.gray('Run this command from your project root.');
    process.exit(1);
  }

  logger.info('\n🔨 LeanMCP Build\n');

  // Step 1: Scan for UI components
  const scanSpinner = ora('Scanning for @UIApp components...').start();
  const uiApps = await scanUIApp(cwd);

  if (uiApps.length === 0) {
    scanSpinner.succeed('No @UIApp components found');
  } else {
    scanSpinner.succeed(`Found ${uiApps.length} @UIApp component(s)`);
  }

  // Step 2: Build UI components (production mode)
  const manifest: Record<
    string,
    | string
    | {
        htmlPath: string;
        isGPTApp?: boolean;
        gptMeta?: any;
      }
  > = {};

  if (uiApps.length > 0) {
    const buildSpinner = ora('Building UI components...').start();
    const errors: string[] = [];

    for (const app of uiApps) {
      const result = await buildUIComponent(app, cwd, false);
      if (result.success) {
        manifest[app.resourceUri] = {
          htmlPath: result.htmlPath,
          isGPTApp: app.isGPTApp,
          gptMeta: app.gptOptions,
        };
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

  // Step 4: Generate schema metadata (for fast runtime schema generation)
  const schemaSpinner = ora('Generating schema metadata...').start();
  try {
    await generateSchemaMetadata(cwd);
    schemaSpinner.succeed('Schema metadata generated');
  } catch (error) {
    schemaSpinner.warn('Schema metadata generation failed (runtime fallback will be used)');
    logger.gray(`   ${error instanceof Error ? error.message : String(error)}`);
  }

  logger.success('\nBuild complete!');
  logger.gray('\nTo start the server:');
  logger.info('  npm run start:node\n');
}
