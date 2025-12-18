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

    // Generate entry HTML (without CDN, with CSS link)
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

    // Generate tailwind.config.js with absolute paths
    const tailwindConfig = path.join(tempDir, 'tailwind.config.js');
    await fs.writeFile(tailwindConfig, `
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        '${path.join(projectDir, '**/*.{ts,tsx,js,jsx}').replace(/\\/g, '/')}',
        '${path.join(projectDir, 'mcp/**/*.{ts,tsx,js,jsx}').replace(/\\/g, '/')}',
        '${path.join(projectDir, 'node_modules/@leanmcp/ui/**/*.{js,mjs}').replace(/\\/g, '/')}',
        '${path.join(projectDir, '../../packages/ui/src/**/*.{ts,tsx}').replace(/\\/g, '/')}',
    ],
    darkMode: ['class'],
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px',
            },
        },
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
        },
    },
    plugins: [],
}
`);

    // Generate styles.css with Tailwind directives and CSS variables
    const stylesCss = path.join(tempDir, 'styles.css');
    await fs.writeFile(stylesCss, `
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
    :root {
        --background: 0 0% 100%;
        --foreground: 222.2 84% 4.9%;
        --card: 0 0% 100%;
        --card-foreground: 222.2 84% 4.9%;
        --popover: 0 0% 100%;
        --popover-foreground: 222.2 84% 4.9%;
        --primary: 222.2 47.4% 11.2%;
        --primary-foreground: 210 40% 98%;
        --secondary: 210 40% 96.1%;
        --secondary-foreground: 222.2 47.4% 11.2%;
        --muted: 210 40% 96.1%;
        --muted-foreground: 215.4 16.3% 46.9%;
        --accent: 210 40% 96.1%;
        --accent-foreground: 222.2 47.4% 11.2%;
        --destructive: 0 84.2% 60.2%;
        --destructive-foreground: 210 40% 98%;
        --border: 214.3 31.8% 91.4%;
        --input: 214.3 31.8% 91.4%;
        --ring: 222.2 84% 4.9%;
        --radius: 0.5rem;
    }

    .dark {
        --background: 222.2 84% 4.9%;
        --foreground: 210 40% 98%;
        --card: 222.2 84% 4.9%;
        --card-foreground: 210 40% 98%;
        --popover: 222.2 84% 4.9%;
        --popover-foreground: 210 40% 98%;
        --primary: 210 40% 98%;
        --primary-foreground: 222.2 47.4% 11.2%;
        --secondary: 217.2 32.6% 17.5%;
        --secondary-foreground: 210 40% 98%;
        --muted: 217.2 32.6% 17.5%;
        --muted-foreground: 215 20.2% 65.1%;
        --accent: 217.2 32.6% 17.5%;
        --accent-foreground: 210 40% 98%;
        --destructive: 0 62.8% 30.6%;
        --destructive-foreground: 210 40% 98%;
        --border: 217.2 32.6% 17.5%;
        --input: 217.2 32.6% 17.5%;
        --ring: 212.7 26.8% 83.9%;
    }

    body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background-color: hsl(var(--background));
        color: hsl(var(--foreground));
    }
}
`);

    // Generate entry JS that imports and renders the component with AppProvider
    const relativeComponentPath = path.relative(tempDir, componentPath).replace(/\\/g, '/');
    await fs.writeFile(entryJs, `
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider, Toaster } from '@leanmcp/ui';
import '@leanmcp/ui/styles.css';
import './styles.css';
import { ${componentName} } from '${relativeComponentPath.replace(/\.tsx?$/, '')}';

const APP_INFO = {
    name: '${componentName}',
    version: '1.0.0'
};

function App() {
    return (
        <AppProvider appInfo={APP_INFO}>
            <${componentName} />
            <Toaster />
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
            css: {
                postcss: {
                    plugins: [
                        (await import('tailwindcss') as any).default({ config: tailwindConfig }),
                        (await import('autoprefixer') as any).default,
                    ],
                },
            },
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
