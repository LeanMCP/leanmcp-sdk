/**
 * Scanner for @UIApp decorators in TypeScript files.
 * Scans MCP service files to find UIApp decorator usage
 * and extracts the component path for Vite building.
 */
import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

export interface UIAppInfo {
    /** Service file path (e.g., mcp/weather/index.ts) */
    servicePath: string;
    /** Component file path (e.g., mcp/weather/WeatherCard.tsx) */
    componentPath: string;
    /** Component export name (e.g., WeatherCard) */
    componentName: string;
    /** Resource URI (e.g., ui://weather/getWeather) */
    resourceUri: string;
    /** Method name on the service */
    methodName: string;
    /** Service class name */
    serviceName: string;
}

/**
 * Scan for @UIApp decorator usage in the project
 */
export async function scanUIApp(projectDir: string): Promise<UIAppInfo[]> {
    const mcpDir = path.join(projectDir, 'mcp');

    if (!await fs.pathExists(mcpDir)) {
        return [];
    }

    // Find all TypeScript files in mcp directory
    const tsFiles = await glob('**/*.ts', {
        cwd: mcpDir,
        absolute: false,
        ignore: ['**/*.d.ts', '**/node_modules/**']
    });

    const results: UIAppInfo[] = [];

    for (const relativeFile of tsFiles) {
        const filePath = path.join(mcpDir, relativeFile);
        const content = await fs.readFile(filePath, 'utf-8');

        // Check if file imports from @leanmcp/ui and uses @UIApp
        if (!content.includes('@UIApp') || !content.includes('@leanmcp/ui')) {
            continue;
        }

        // Parse @UIApp decorators from the file
        const uiApps = parseUIAppDecorators(content, filePath);
        results.push(...uiApps);
    }

    return results;
}

/**
 * Parse @UIApp decorator usage from file content
 */
function parseUIAppDecorators(content: string, filePath: string): UIAppInfo[] {
    const results: UIAppInfo[] = [];

    // Extract service class name
    const classMatch = content.match(/export\s+class\s+(\w+)/);
    const serviceName = classMatch ? classMatch[1] : 'Unknown';

    // Extract imports to find component paths
    const importMap = parseImports(content, filePath);

    // Find @UIApp decorators with component reference
    // Pattern: @UIApp({ component: ComponentName, ... })
    const uiAppRegex = /@UIApp\s*\(\s*\{([^}]+)\}\s*\)\s*(?:async\s+)?(\w+)/g;
    let match;

    while ((match = uiAppRegex.exec(content)) !== null) {
        const decoratorBody = match[1];
        const methodName = match[2];

        // Extract component name from decorator
        const componentMatch = decoratorBody.match(/component\s*:\s*(\w+)/);
        if (!componentMatch) continue;

        const componentName = componentMatch[1];
        const componentPath = importMap[componentName];

        if (!componentPath) {
            console.warn(`[scanUIApp] Could not resolve import for component: ${componentName}`);
            continue;
        }

        // Generate resource URI: ui://<service-lowercase>/<methodName>
        const servicePrefix = serviceName.replace(/Service$/i, '').toLowerCase();
        const resourceUri = `ui://${servicePrefix}/${methodName}`;

        results.push({
            servicePath: filePath,
            componentPath,
            componentName,
            resourceUri,
            methodName,
            serviceName,
        });
    }

    return results;
}

/**
 * Parse import statements to map component names to file paths
 */
function parseImports(content: string, filePath: string): Record<string, string> {
    const importMap: Record<string, string> = {};
    const dir = path.dirname(filePath);

    // Match: import { ComponentName } from './path' or import { A, B } from './path'
    const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[2];

        // Only process relative imports
        if (!importPath.startsWith('.')) continue;

        const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/).pop()!.trim());

        // Resolve the import path to absolute
        let resolvedPath = path.resolve(dir, importPath);

        // Add .tsx extension if not present
        if (!resolvedPath.endsWith('.tsx') && !resolvedPath.endsWith('.ts')) {
            if (fs.existsSync(resolvedPath + '.tsx')) {
                resolvedPath += '.tsx';
            } else if (fs.existsSync(resolvedPath + '.ts')) {
                resolvedPath += '.ts';
            }
        }

        for (const name of names) {
            importMap[name] = resolvedPath;
        }
    }

    return importMap;
}
