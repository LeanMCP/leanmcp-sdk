/**
 * leanmcp dev command
 * 
 * Builds UI components with Vite and starts the development server with hot-reload.
 */
import { spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import chokidar from 'chokidar';
import { scanUIApp, buildUIComponent, writeUIManifest } from '../vite';

export async function devCommand() {
    const cwd = process.cwd();

    // Check if this is a LeanMCP project
    if (!await fs.pathExists(path.join(cwd, 'main.ts'))) {
        console.error(chalk.red('ERROR: Not a LeanMCP project (main.ts not found).'));
        console.error(chalk.gray('Run this command from your project root.'));
        process.exit(1);
    }

    console.log(chalk.cyan('\n🚀 LeanMCP Development Server\n'));

    // Step 1: Scan for UI components
    const scanSpinner = ora('Scanning for @UIApp components...').start();
    const uiApps = await scanUIApp(cwd);

    if (uiApps.length === 0) {
        scanSpinner.succeed('No @UIApp components found');
    } else {
        scanSpinner.succeed(`Found ${uiApps.length} @UIApp component(s)`);
        for (const app of uiApps) {
            console.log(chalk.gray(`   • ${app.componentName} → ${app.resourceUri}`));
        }
    }

    // Step 2: Build UI components
    const manifest: Record<string, string> = {};

    if (uiApps.length > 0) {
        const buildSpinner = ora('Building UI components...').start();
        const errors: string[] = [];

        for (const app of uiApps) {
            const result = await buildUIComponent(app, cwd, true);
            if (result.success) {
                manifest[app.resourceUri] = result.htmlPath;
            } else {
                errors.push(`${app.componentName}: ${result.error}`);
            }
        }

        // Write manifest for core to auto-register resources
        await writeUIManifest(manifest, cwd);

        if (errors.length > 0) {
            buildSpinner.warn('Built with warnings');
            for (const error of errors) {
                console.error(chalk.yellow(`   ⚠ ${error}`));
            }
        } else {
            buildSpinner.succeed('UI components built');
        }
    }

    // Step 3: Start tsx watch for the server
    console.log(chalk.cyan('\nStarting development server...\n'));

    const devServer = spawn('npx', ['tsx', 'watch', 'main.ts'], {
        cwd,
        stdio: 'inherit',
        shell: true,
    });

    // Step 4: Watch for UI component changes
    let watcher: chokidar.FSWatcher | null = null;

    if (uiApps.length > 0) {
        const componentPaths = uiApps.map(app => app.componentPath);

        watcher = chokidar.watch(componentPaths, {
            ignoreInitial: true,
        });

        watcher.on('change', async (changedPath) => {
            const app = uiApps.find(a => a.componentPath === changedPath);
            if (!app) return;

            console.log(chalk.cyan(`\n[UI] Rebuilding ${app.componentName}...`));

            const result = await buildUIComponent(app, cwd, true);

            if (result.success) {
                manifest[app.resourceUri] = result.htmlPath;
                await writeUIManifest(manifest, cwd);
                console.log(chalk.green(`[UI] ${app.componentName} rebuilt successfully`));
            } else {
                console.log(chalk.yellow(`[UI] ${app.componentName} build failed: ${result.error}`));
            }
        });
    }

    // Handle process termination
    const cleanup = () => {
        console.log(chalk.gray('\nShutting down...'));
        if (watcher) watcher.close();
        devServer.kill();
        process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Wait for dev server to exit
    devServer.on('exit', (code) => {
        if (watcher) watcher.close();
        process.exit(code ?? 0);
    });
}
