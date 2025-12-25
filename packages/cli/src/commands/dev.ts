/**
 * leanmcp dev command
 * 
 * Builds UI components with Vite and starts the development server with hot-reload.
 */
import { spawn } from 'child_process';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';
import chokidar, { type FSWatcher } from 'chokidar';
import { scanUIApp, buildUIComponent, writeUIManifest, deleteUIComponent, type UIAppInfo } from '../vite';
import { logger, chalk } from '../logger';

/**
 * Compute hash of file content for change detection
 */
function computeHash(filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf-8');
    return crypto.createHash('md5').update(content).digest('hex');
}

interface UIDiff {
    removed: string[]; // URIs that were removed
    added: Set<string>; // URIs that were added
    addedOrChanged: UIAppInfo[]; // Apps to rebuild (added + changed)
}

/**
 * Compute diff between previous and current UIApps
 */
function computeDiff(
    previousUIApps: UIAppInfo[],
    currentUIApps: UIAppInfo[],
    hashCache: Map<string, string>
): UIDiff {
    const previousURIs = new Set(previousUIApps.map(app => app.resourceUri));
    const currentURIs = new Set(currentUIApps.map(app => app.resourceUri));

    // Removed: in previous but not in current
    const removed = Array.from(previousURIs).filter(uri => !currentURIs.has(uri));

    // Added: in current but not in previous
    const added = new Set(Array.from(currentURIs).filter(uri => !previousURIs.has(uri)));

    // Changed: same URI but component content hash differs
    const addedOrChanged: UIAppInfo[] = [];

    for (const app of currentUIApps) {
        const isNew = added.has(app.resourceUri);

        if (isNew) {
            addedOrChanged.push(app);
        } else {
            // Check if component hash changed
            const oldHash = hashCache.get(app.resourceUri);
            let newHash: string | undefined;

            if (fs.existsSync(app.componentPath)) {
                newHash = computeHash(app.componentPath);
            }

            if (oldHash !== newHash) {
                addedOrChanged.push(app);
            }
        }
    }

    return { removed, added, addedOrChanged };
}

export async function devCommand() {
    const cwd = process.cwd();

    // Check if this is a LeanMCP project
    if (!await fs.pathExists(path.join(cwd, 'main.ts'))) {
        logger.error('ERROR: Not a LeanMCP project (main.ts not found).');
        logger.gray('Run this command from your project root.');
        process.exit(1);
    }

    logger.info('\nLeanMCP Development Server\n');

    // Step 1: Scan for UI components
    const scanSpinner = ora('Scanning for @UIApp components...').start();
    const uiApps = await scanUIApp(cwd);

    if (uiApps.length === 0) {
        scanSpinner.info('No @UIApp components found');
    } else {
        scanSpinner.info(`Found ${uiApps.length} @UIApp component(s)`);
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
                logger.warn(`   ${error}`);
            }
        } else {
            buildSpinner.info('UI components built');
        }
    }

    // Step 3: Start tsx watch for the server
    logger.info('\nStarting development server...\n');

    const devServer = spawn('npx', ['tsx', 'watch', 'main.ts'], {
        cwd,
        stdio: 'inherit',
        shell: true,
    });

    // Step 4: Watch mcp directory for all changes (decorators + components)
    let watcher: FSWatcher | null = null;

    // Hash cache for change detection
    const componentHashCache = new Map<string, string>();

    // Initialize hash cache for current UIApps
    for (const app of uiApps) {
        if (await fs.pathExists(app.componentPath)) {
            componentHashCache.set(app.resourceUri, computeHash(app.componentPath));
        }
    }

    // Store previous UIApps for diffing
    let previousUIApps: UIAppInfo[] = uiApps;

    // Watch mcp/**/* for all changes
    const mcpPath = path.join(cwd, 'mcp');
    watcher = chokidar.watch(mcpPath, {
        ignoreInitial: true,
        ignored: ['**/node_modules/**', '**/*.d.ts'],
        persistent: true,
        awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50
        }
    });

    // Debounced handler (150ms coalesce for rapid saves)
    let debounceTimer: NodeJS.Timeout | null = null;

    watcher.on('all', async (event: string, changedPath: string) => {
        if (debounceTimer) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(async () => {
            // Re-scan for current UIApps
            const currentUIApps = await scanUIApp(cwd);

            // Compute diff
            const diff = computeDiff(previousUIApps, currentUIApps, componentHashCache);

            if (diff.removed.length === 0 && diff.addedOrChanged.length === 0) {
                return;
            }

            // Handle removed UIApps
            for (const uri of diff.removed) {
                logger.warn(`Removing ${uri}...`);
                await deleteUIComponent(uri, cwd);
                delete manifest[uri];
                componentHashCache.delete(uri);
            }

            // Handle added or changed UIApps
            for (const app of diff.addedOrChanged) {
                const action = diff.added.has(app.resourceUri) ? 'Building' : 'Rebuilding';
                logger.info(`${action} ${app.componentName}...`);

                const result = await buildUIComponent(app, cwd, true);

                if (result.success) {
                    manifest[app.resourceUri] = result.htmlPath;
                    // Update hash cache
                    if (await fs.pathExists(app.componentPath)) {
                        componentHashCache.set(app.resourceUri, computeHash(app.componentPath));
                    }
                    logger.success(`${app.componentName} ${action.toLowerCase()} complete`);
                } else {
                    logger.warn(`Build failed: ${result.error}`);
                }
            }

            // Write manifest atomically after all operations
            await writeUIManifest(manifest, cwd);

            // Update previous UIApps for next diff
            previousUIApps = currentUIApps;
        }, 150);
    });

    // Handle process termination
    let isCleaningUp = false;
    const cleanup = () => {
        if (isCleaningUp) return;
        isCleaningUp = true;

        logger.gray('\nShutting down...');
        if (watcher) watcher.close();
        devServer.kill('SIGTERM');

        // Don't call process.exit here - let the devServer exit handler do it
        // This prevents terminal crashes on Windows
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Wait for dev server to exit
    devServer.on('exit', (code) => {
        if (watcher) watcher.close();
        process.exit(code ?? 0);
    });
}
