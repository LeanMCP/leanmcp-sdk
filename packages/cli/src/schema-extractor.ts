/**
 * Schema Extractor
 *
 * Extracts type information from TypeScript source files at build time
 * and generates schema-metadata.json for fast runtime schema generation.
 */
import path from 'path';
import fs from 'fs-extra';

// ts-morph is a dev dependency of CLI
import { Project, Node, SyntaxKind } from 'ts-morph';

export interface SchemaMetadata {
    [className: string]: {
        [propertyName: string]: {
            type: string;
            items?: { type: string };
        };
    };
}

/**
 * Generate schema metadata for all input classes in the project.
 * Uses reachability analysis: finds classes used as inputs to @Tool/@Prompt methods.
 */
export async function generateSchemaMetadata(projectDir: string): Promise<void> {
    const metadata: SchemaMetadata = {};

    // Maps to store discovery
    const classesByName = new Map<string, any>(); // ClassDeclaration
    const classesToProcess = new Set<string>();
    const processedClasses = new Set<string>();

    // Create ts-morph project
    const project = new Project({
        skipAddingFilesFromTsConfig: true,
        skipFileDependencyResolution: true,
    });

    // Find all TypeScript files (excluding node_modules and dist)
    const tsFiles = await findTsFiles(projectDir);

    // Pass 1: Scan all files to find classes and tool usages
    for (const filePath of tsFiles) {
        try {
            const sourceFile = project.addSourceFileAtPath(filePath);

            // Register all classes by name
            for (const classDecl of sourceFile.getClasses()) {
                const className = classDecl.getName();
                if (className) {
                    classesByName.set(className, classDecl);
                }
            }

            // Find tool usages to seed the processing queue
            // Look for classes with methods decorated with @Tool, @Prompt, @Resource
            for (const classDecl of sourceFile.getClasses()) {
                for (const method of classDecl.getInstanceMethods()) {
                    const decorators = method.getDecorators();
                    const isTool = decorators.some(d => {
                        const name = d.getName();
                        return ['Tool', 'Prompt', 'Resource'].includes(name);
                    });

                    if (isTool) {
                        // Check first argument for input type
                        const params = method.getParameters();
                        if (params.length > 0) {
                            const paramToken = params[0]; // First argument is input
                            const typeNode = paramToken.getTypeNode();
                            if (typeNode) {
                                const typeName = typeNode.getText().trim();
                                // If it's a class reference (not primitive)
                                if (!isPrimitive(typeName)) {
                                    classesToProcess.add(extractBaseClassName(typeName));
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            // Skip parsing errors
        }
    }

    // Pass 2: Process the queue (BFS for dependencies)
    for (const className of classesToProcess) {
        if (processedClasses.has(className)) continue;

        const classDecl = classesByName.get(className);
        if (!classDecl) continue; // Class not found in project sources

        // Extract properties
        const propertyTypes: SchemaMetadata[string] = {};

        for (const prop of classDecl.getInstanceProperties()) {
            if (Node.isPropertyDeclaration(prop)) {
                const propName = prop.getName();
                const typeNode = prop.getTypeNode();

                if (typeNode) {
                    const typeText = typeNode.getText();
                    const schemaType = typeTextToSchemaType(typeText);
                    propertyTypes[propName] = schemaType;

                    // Check if we need to process referenced types
                    const baseType = extractBaseClassName(typeText);
                    if (!isPrimitive(baseType) && !processedClasses.has(baseType)) {
                        classesToProcess.add(baseType);
                    }
                }
            }
        }

        if (Object.keys(propertyTypes).length > 0) {
            metadata[className] = propertyTypes;
        }

        processedClasses.add(className);
    }

    // Write metadata to dist/schema-metadata.json
    const outputPath = path.join(projectDir, 'dist', 'schema-metadata.json');
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeJSON(outputPath, metadata, { spaces: 2 });
}

/**
 * Check if a type name is a primitive
 */
function isPrimitive(typeName: string): boolean {
    const t = typeName.toLowerCase();
    return ['string', 'number', 'boolean', 'any', 'void', 'null', 'undefined', 'object', 'date'].includes(t);
}

/**
 * Extract base class name from type string (e.g. "MyClass[]" -> "MyClass")
 */
function extractBaseClassName(typeText: string): string {
    let name = typeText.trim();
    // Remove array brackets
    if (name.endsWith('[]')) {
        name = name.slice(0, -2);
    }
    // Remove Array<T> wrapper
    const arrayMatch = name.match(/^Array<(.+)>$/i);
    if (arrayMatch) {
        name = arrayMatch[1];
    }
    return name.trim();
}

/**
 * Find all TypeScript files in the project
 */
async function findTsFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    async function scan(currentDir: string) {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                // Skip node_modules, dist, .git
                if (['node_modules', 'dist', '.git', '.leanmcp'].includes(entry.name)) {
                    continue;
                }
                await scan(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
                files.push(fullPath);
            }
        }
    }

    await scan(dir);
    return files;
}

/**
 * Convert TypeScript type text to JSON Schema type
 */
function typeTextToSchemaType(typeText: string): { type: string; items?: { type: string } } {
    const type = typeText.trim().replace(/\?$/, '');

    // Array types: string[], number[], etc.
    if (type.endsWith('[]')) {
        const elementType = type.slice(0, -2).toLowerCase();
        return {
            type: 'array',
            items: { type: mapPrimitiveType(elementType) },
        };
    }

    // Array<T> syntax
    const arrayMatch = type.match(/^Array<(.+)>$/i);
    if (arrayMatch) {
        const elementType = arrayMatch[1].trim().toLowerCase();
        return {
            type: 'array',
            items: { type: mapPrimitiveType(elementType) },
        };
    }

    // Primitive types
    return { type: mapPrimitiveType(type.toLowerCase()) };
}

/**
 * Map TypeScript primitive types to JSON Schema types
 */
function mapPrimitiveType(tsType: string): string {
    switch (tsType) {
        case 'string':
            return 'string';
        case 'number':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'integer':
            return 'integer';
        default:
            return 'string'; // Default to string for unknown types
    }
}
