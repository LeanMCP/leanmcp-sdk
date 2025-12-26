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
    /** True if this is a @GPTApp (ChatGPT-specific) */
    isGPTApp: boolean;
    /** GPT-specific options if applicable */
    gptOptions?: {
        widgetAccessible?: boolean;
        visibility?: 'public' | 'private';
        prefersBorder?: boolean;
        widgetDomain?: string;
        widgetDescription?: string;
    };
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

        // Check if file imports from @leanmcp/ui (or @leanmcp/ui/server) and uses @UIApp or @GPTApp
        if ((!content.includes('@UIApp') && !content.includes('@GPTApp')) || !content.includes('@leanmcp/ui')) {
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

    // Find @UIApp or @GPTApp decorators with component reference
    // Pattern: @(UIApp|GPTApp)({ component: ComponentName, ... }) OR @(UIApp|GPTApp)({ component: './path', ... })
    const uiAppRegex = /@(UIApp|GPTApp)\s*\(\s*\{([\s\S]+?)\}\s*\)\s*(?:async\s+)?(\w+)/g;
    let match;

    while ((match = uiAppRegex.exec(content)) !== null) {
        const decoratorName = match[1]; // UIApp or GPTApp
        const decoratorBody = match[2];
        const methodName = match[3];

        const isGPTApp = decoratorName === 'GPTApp';

        // Try to extract component - can be identifier OR string literal
        // Pattern 1: component: ComponentName (identifier)
        // Pattern 2: component: './path' or component: "./path" (string)
        let componentPath: string | undefined;
        let componentName: string;

        const stringMatch = decoratorBody.match(/component\s*:\s*['"]([^'"]+)['"]/);
        if (stringMatch) {
            // String path like './ProductsDashboard'
            const relativePath = stringMatch[1];
            const dir = path.dirname(filePath);
            let resolvedPath = path.resolve(dir, relativePath);

            // Add extension if not present
            if (!resolvedPath.endsWith('.tsx') && !resolvedPath.endsWith('.ts')) {
                if (fs.existsSync(resolvedPath + '.tsx')) {
                    resolvedPath += '.tsx';
                } else if (fs.existsSync(resolvedPath + '.ts')) {
                    resolvedPath += '.ts';
                }
            }

            componentPath = resolvedPath;
            // Extract component name from path (e.g., './ProductsDashboard' -> 'ProductsDashboard')
            componentName = path.basename(relativePath).replace(/\.(tsx?|jsx?)$/, '');
        } else {
            // Identifier reference like: component: ProductsDashboard
            const identifierMatch = decoratorBody.match(/component\s*:\s*(\w+)/);
            if (!identifierMatch) continue;

            componentName = identifierMatch[1];
            componentPath = importMap[componentName];

            if (!componentPath) {
                console.warn(`[scanUIApp] Could not resolve import for component: ${componentName}`);
                continue;
            }
        }

        if (!componentPath) continue;

        // Generate resource URI: ui://<service-lowercase>/<methodName>
        const servicePrefix = serviceName.replace(/Service$/i, '').toLowerCase();
        let resourceUri = `ui://${servicePrefix}/${methodName}`;

        // Check for custom URI in options
        const uriMatch = decoratorBody.match(/uri\s*:\s*['"]([^'"]+)['"]/);
        if (uriMatch) {
            resourceUri = uriMatch[1];
        }

        // Extract GPT-specific options if it's a GPTApp
        let gptOptions: UIAppInfo['gptOptions'] = undefined;
        if (isGPTApp) {
            gptOptions = {};

            // Extract booleans
            if (decoratorBody.includes('widgetAccessible: true')) gptOptions.widgetAccessible = true;
            if (decoratorBody.includes('prefersBorder: true')) gptOptions.prefersBorder = true;

            // Extract strings
            const visibilityMatch = decoratorBody.match(/visibility\s*:\s*['"](public|private)['"]/);
            if (visibilityMatch) gptOptions.visibility = visibilityMatch[1] as 'public' | 'private';

            const domainMatch = decoratorBody.match(/widgetDomain\s*:\s*['"]([^'"]+)['"]/);
            if (domainMatch) gptOptions.widgetDomain = domainMatch[1];

            const descriptionMatch = decoratorBody.match(/widgetDescription\s*:\s*['"]([^'"]+)['"]/);
            if (descriptionMatch) gptOptions.widgetDescription = descriptionMatch[1];

            // Note: Complex objects like CSP are hard to regex reliably. 
            // For build purposes we mainly need to know it IS a GPTApp to set mimeType.
            // Full metadata is constructed at runtime by the decorator.
        }

        results.push({
            servicePath: filePath,
            componentPath,
            componentName,
            resourceUri,
            methodName,
            serviceName,
            isGPTApp,
            gptOptions
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
