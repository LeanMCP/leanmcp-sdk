/**
 * TypeScript Source Type Parser
 *
 * Parses TypeScript source files at runtime to extract actual type annotations
 * (e.g., `string[]`, `number[]`), which are erased by TypeScript compilation.
 *
 * This solves the problem of `reflect-metadata` only returning `Array` for
 * array types, without the element type information needed for JSON Schema.
 */
import path from 'path';
import fs from 'fs';
import { createRequire } from 'node:module';

// Cache to avoid re-parsing the same file
const typeCache = new Map<string, Map<string, any>>();

// Track source file paths for classes
const classSourceMap = new Map<string, string>();

// Lazy-loaded ts-morph references
let tsMorphProject: any = null;
let tsMorphNode: any = null;
let tsMorphLoaded = false;

/**
 * Synchronously load ts-morph
 */
function loadTsMorph(): boolean {
  if (tsMorphLoaded) {
    return tsMorphProject !== null;
  }

  tsMorphLoaded = true;

  try {
    // Create require that works in ESM
    const customRequire = createRequire(import.meta.url);
    const tsMorph = customRequire('ts-morph');
    tsMorphProject = tsMorph.Project;
    tsMorphNode = tsMorph.Node;
    return true;
  } catch (error: any) {
    // ts-morph not available - graceful fallback
    console.warn(`[type-parser] ts-morph not available: ${error.message}`);
    return false;
  }
}

/**
 * Register the source file path for an input class.
 * This is called during decorator execution to capture the source location.
 */
export function registerClassSource(className: string, sourceFile: string): void {
  classSourceMap.set(className, sourceFile);
}

/**
 * Parse a TypeScript class and extract JSON Schema types for each property.
 * Automatically detects array types like `string[]` and adds proper `items`.
 *
 * This is now SYNCHRONOUS for easier integration with existing code.
 */
export function parseClassTypesSync(
  classConstructor: new () => any,
  sourceFilePath?: string
): Map<string, any> {
  if (!loadTsMorph()) {
    return new Map();
  }

  const className = classConstructor.name;

  // Try to find source file from multiple sources
  let filePath = sourceFilePath || classSourceMap.get(className) || findSourceFile();

  if (!filePath) {
    return new Map();
  }

  // Handle .js files by looking for .ts equivalent
  if (filePath.endsWith('.js')) {
    const tsPath = filePath.replace(/\.js$/, '.ts');
    if (fs.existsSync(tsPath)) {
      filePath = tsPath;
    }
  }

  const cacheKey = `${filePath}:${className}`;

  if (typeCache.has(cacheKey)) {
    return typeCache.get(cacheKey)!;
  }

  if (!fs.existsSync(filePath)) {
    return new Map();
  }

  try {
    const project = new tsMorphProject({
      skipAddingFilesFromTsConfig: true,
      skipFileDependencyResolution: true,
      useInMemoryFileSystem: false,
    });

    const sourceFile = project.addSourceFileAtPath(filePath);

    // Find the class by name
    const classDecl = sourceFile.getClass(className);
    if (!classDecl) {
      // Class not found in this file
      return new Map();
    }

    const propertyTypes = new Map<string, any>();

    // Get all properties (instance properties)
    for (const prop of classDecl.getInstanceProperties()) {
      if (tsMorphNode.isPropertyDeclaration(prop)) {
        const propName = prop.getName();
        const typeNode = prop.getTypeNode();

        if (typeNode) {
          const typeText = typeNode.getText();
          const jsonSchemaType = typeTextToJsonSchema(typeText);
          propertyTypes.set(propName, jsonSchemaType);
        }
      }
    }

    typeCache.set(cacheKey, propertyTypes);
    return propertyTypes;
  } catch (error: any) {
    // If parsing fails (e.g., syntax error), return empty map
    console.warn(`[type-parser] Failed to parse ${filePath}: ${error.message}`);
    return new Map();
  }
}

// Alias for backwards compatibility
export const parseClassTypes = parseClassTypesSync;

/**
 * Convert TypeScript type annotation text to JSON Schema.
 * Handles arrays, primitives, and nested types.
 */
function typeTextToJsonSchema(typeText: string): any {
  // Remove whitespace and optional '?' suffix
  const type = typeText.trim().replace(/\?$/, '');

  // Array types: string[], number[], MyType[], etc.
  if (type.endsWith('[]')) {
    const elementType = type.slice(0, -2);
    return {
      type: 'array',
      items: typeTextToJsonSchema(elementType),
    };
  }

  // Array<T> syntax
  const arrayMatch = type.match(/^Array<(.+)>$/);
  if (arrayMatch) {
    return {
      type: 'array',
      items: typeTextToJsonSchema(arrayMatch[1]),
    };
  }

  // Primitive types (case-insensitive match)
  const lowerType = type.toLowerCase();
  switch (lowerType) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: 'number' };
    case 'integer':
      return { type: 'integer' };
    case 'boolean':
      return { type: 'boolean' };
    case 'object':
      return { type: 'object' };
    case 'any':
    case 'unknown':
      return {}; // No constraints
    case 'null':
      return { type: 'null' };
  }

  // Union types containing null (e.g., "string | null")
  if (type.includes('|')) {
    const parts = type.split('|').map((p) => p.trim());
    const nonNullParts = parts.filter((p) => p.toLowerCase() !== 'null');
    if (nonNullParts.length === 1) {
      // Simple nullable type
      return typeTextToJsonSchema(nonNullParts[0]);
    }
    // Multiple types - return anyOf (not commonly used in tools)
    return {
      anyOf: nonNullParts.map((p) => typeTextToJsonSchema(p)),
    };
  }

  // For complex/custom types, default to object
  return { type: 'object' };
}

/**
 * Find the source file where the caller's input class is likely defined.
 * Uses stack trace to locate the original .ts file.
 */
function findSourceFile(): string | null {
  const originalPrepareStackTrace = Error.prepareStackTrace;
  try {
    Error.prepareStackTrace = (_, stack) => stack;
    const err = new Error();
    const stack = err.stack as unknown as NodeJS.CallSite[];

    // Walk the stack looking for user code (not node_modules, not this file)
    for (const site of stack) {
      const fileName = site.getFileName();
      if (
        fileName &&
        !fileName.includes('node_modules') &&
        !fileName.includes('type-parser') &&
        !fileName.includes('schema-generator') &&
        (fileName.endsWith('.ts') || fileName.endsWith('.js'))
      ) {
        // Prefer .ts file if .js was found
        if (fileName.endsWith('.js')) {
          const tsPath = fileName.replace(/\.js$/, '.ts');
          if (fs.existsSync(tsPath)) {
            return tsPath;
          }
        }
        return fileName;
      }
    }
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }

  return null;
}

/**
 * Clear the type cache (useful for hot reloading)
 */
export function clearTypeCache(): void {
  typeCache.clear();
}
