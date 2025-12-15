/**
 * Vite build helper for single-file HTML output
 * 
 * Uses Vite + vite-plugin-singlefile to bundle a React component
 * into a self-contained HTML file.
 * 
 * Simple approach (like ext-apps examples):
 * 1. Generate HTML with script tag pointing to user's component
 * 2. Let Vite bundle everything (user's TSX imports @leanmcp/ui directly)
 * 3. No shim needed - @leanmcp/ui is now fully browser-safe
 */
import * as vite from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'fs-extra';
import path from 'path';
import type { UIAppInfo } from './scanUIApp';

export interface BuildResult {
    success: boolean;
    htmlPath: string;
    error?: string;
}

/**
 * Build a UI component to a single-file HTML
 */
export async function buildUIComponent(
    uiApp: UIAppInfo,
    projectDir: string,
    isDev = false
): Promise<BuildResult> {
    const { componentPath, componentName, resourceUri } = uiApp;

    // Output path: dist/ui/<safe-uri-name>.html
    const safeFileName = resourceUri.replace('ui://', '').replace(/\//g, '-') + '.html';
    const outDir = path.join(projectDir, 'dist', 'ui');
    const htmlPath = path.join(outDir, safeFileName);

    await fs.ensureDir(outDir);

    // Create temporary directory for build
    const tempDir = path.join(projectDir, '.leanmcp-temp');
    await fs.ensureDir(tempDir);

    const entryHtml = path.join(tempDir, 'index.html');
    const entryJs = path.join(tempDir, 'entry.tsx');

    // Generate entry HTML (simple, like ext-apps)
    await fs.writeFile(entryHtml, `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP App</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="./entry.tsx"></script>
</body>
</html>`);

    // Generate entry JS that imports and renders the component with AppProvider
    const relativeComponentPath = path.relative(tempDir, componentPath).replace(/\\/g, '/');
    await fs.writeFile(entryJs, `
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from '@leanmcp/ui';
import { ${componentName} } from '${relativeComponentPath.replace(/\.tsx?$/, '')}';

const APP_INFO = {
    name: '${componentName}',
    version: '1.0.0'
};

function App() {
    return (
        <AppProvider appInfo={APP_INFO}>
            <${componentName} />
        </AppProvider>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
`);

    try {
        // Build with Vite
        await vite.build({
            root: tempDir,
            plugins: [
                react(),
                viteSingleFile(),
            ],
            build: {
                outDir,
                emptyOutDir: false,
                sourcemap: isDev ? 'inline' : false,
                minify: !isDev,
                rollupOptions: {
                    input: entryHtml,
                    output: {
                        entryFileNames: `[name].js`,
                    },
                },
            },
            logLevel: 'warn',
        });

        // Rename output to desired filename
        const builtHtml = path.join(outDir, 'index.html');
        if (await fs.pathExists(builtHtml)) {
            await fs.move(builtHtml, htmlPath, { overwrite: true });
        }

        // Clean up temp files (keep folder for faster rebuilds)
        await fs.remove(entryHtml);
        await fs.remove(entryJs);

        return { success: true, htmlPath };
    } catch (error: any) {
        return { success: false, htmlPath: '', error: error.message };
    }
}

/**
 * Write the UI manifest file for auto-registration
 */
export async function writeUIManifest(
    manifest: Record<string, string>,
    projectDir: string
): Promise<void> {
    const manifestPath = path.join(projectDir, 'dist', 'ui-manifest.json');
    await fs.ensureDir(path.dirname(manifestPath));
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });
}
