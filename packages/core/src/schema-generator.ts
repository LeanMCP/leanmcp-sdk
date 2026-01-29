import 'reflect-metadata';
import { parseClassTypesSync, registerClassSource } from './type-parser';
import path from 'path';
import fs from 'fs';

/**
 * Converts a TypeScript class to JSON Schema
 * Uses reflect-metadata and TypeScript design:type metadata
 */
export function classToJsonSchema(classConstructor: new () => any): any {
  const instance = new classConstructor();
  const properties: Record<string, any> = {};
  const required: string[] = [];

  // Get all property names from the class instance
  const propertyNames = Object.keys(instance);

  // Get property types using reflect-metadata
  for (const propertyName of propertyNames) {
    const propertyType = Reflect.getMetadata('design:type', instance, propertyName);

    // Convert TypeScript type to JSON Schema type
    let jsonSchemaType = 'any';
    if (propertyType) {
      switch (propertyType.name) {
        case 'String':
          jsonSchemaType = 'string';
          break;
        case 'Number':
          jsonSchemaType = 'number';
          break;
        case 'Boolean':
          jsonSchemaType = 'boolean';
          break;
        case 'Array':
          jsonSchemaType = 'array';
          break;
        case 'Object':
          jsonSchemaType = 'object';
          break;
        default:
          jsonSchemaType = 'object';
      }
    }

    properties[propertyName] = { type: jsonSchemaType };

    // Check if property is required (not optional)
    // In TypeScript, optional properties have '?' in declaration
    // We'll assume all properties without default values are required
    const descriptor = Object.getOwnPropertyDescriptor(instance, propertyName);
    if (descriptor && descriptor.value === undefined) {
      // Property has no default value, check if it's required
      const isOptional =
        propertyName.endsWith('?') || Reflect.getMetadata('optional', instance, propertyName);
      if (!isOptional) {
        required.push(propertyName);
      }
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

/**
 * Property decorator to mark a field as optional in JSON Schema
 */
export function Optional(): PropertyDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata('optional', true, target, propertyKey);
  };
}

/**
 * Property decorator to add JSON Schema constraints
 */
export function SchemaConstraint(constraints: {
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  enum?: any[];
  description?: string;
  default?: any;
  type?: string;
}): PropertyDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata('schema:constraints', constraints, target, propertyKey);

    // Capture source file location for later type parsing
    // Uses stack trace to find where the decorator is being applied
    const originalPrepareStackTrace = Error.prepareStackTrace;
    try {
      Error.prepareStackTrace = (_, stack) => stack;
      const err = new Error();
      const stack = err.stack as unknown as NodeJS.CallSite[];

      for (const site of stack) {
        const fileName = site.getFileName();
        if (
          fileName &&
          !fileName.includes('node_modules') &&
          !fileName.includes('schema-generator') &&
          (fileName.endsWith('.ts') || fileName.endsWith('.js'))
        ) {
          // Get the class name from the target
          const className = target.constructor.name;
          if (className && className !== 'Object') {
            registerClassSource(className, fileName);
          }
          break;
        }
      }
    } finally {
      Error.prepareStackTrace = originalPrepareStackTrace;
    }
  };
}

/**
 * Enhanced schema generator that includes constraints.
 * Now integrates with type-parser to extract actual TypeScript types
 * (including array element types like `string[]`).
 */
export function classToJsonSchemaWithConstraints(
  classConstructor: new () => any,
  sourceFilePath?: string
): any {
  const instance = new classConstructor();
  const properties: Record<string, any> = {};
  const required: string[] = [];

  // Try to parse actual TypeScript types from source file
  // This gives us array element types that reflect-metadata doesn't provide
  const parsedTypes = parseClassTypesSync(classConstructor, sourceFilePath);

  const propertyNames = Object.keys(instance);

  for (const propertyName of propertyNames) {
    const propertyType = Reflect.getMetadata('design:type', instance, propertyName);
    const constraints = Reflect.getMetadata('schema:constraints', instance, propertyName);
    const isOptional = Reflect.getMetadata('optional', instance, propertyName);

    // Get parsed type from source (includes proper array items)
    const parsedType = parsedTypes.get(propertyName);

    let propertySchema: any;

    if (parsedType && parsedType.type) {
      // Use parsed type (has accurate array item types)
      propertySchema = { ...parsedType };
    } else if (propertyType) {
      // Fallback to reflect-metadata
      let jsonSchemaType = 'string';
      switch (propertyType.name) {
        case 'String':
          jsonSchemaType = 'string';
          break;
        case 'Number':
          jsonSchemaType = 'number';
          break;
        case 'Boolean':
          jsonSchemaType = 'boolean';
          break;
        case 'Array':
          jsonSchemaType = 'array';
          break;
        case 'Object':
          jsonSchemaType = 'object';
          break;
        default:
          jsonSchemaType = 'object';
      }
      propertySchema = { type: jsonSchemaType };
    } else if (constraints) {
      // Infer type from constraints when design:type metadata is unavailable
      let jsonSchemaType = 'string';
      if (constraints.type) {
        jsonSchemaType = constraints.type;
      } else if (constraints.items) {
        jsonSchemaType = 'array';
      } else if (
        constraints.minLength !== undefined ||
        constraints.maxLength !== undefined ||
        constraints.pattern
      ) {
        jsonSchemaType = 'string';
      } else if (constraints.minimum !== undefined || constraints.maximum !== undefined) {
        jsonSchemaType = 'number';
      } else if (constraints.enum && constraints.enum.length > 0) {
        const firstValue = constraints.enum[0];
        if (typeof firstValue === 'number') {
          jsonSchemaType = 'number';
        } else if (typeof firstValue === 'boolean') {
          jsonSchemaType = 'boolean';
        } else {
          jsonSchemaType = 'string';
        }
      }
      propertySchema = { type: jsonSchemaType };
    } else {
      // Default to string when no type info available
      propertySchema = { type: 'string' };
    }

    // Merge constraints (description, enum, min/max, etc.)
    if (constraints) {
      // Keep the parsed items if present, don't override with constraints
      const parsedItems = propertySchema.items;
      propertySchema = { ...propertySchema, ...constraints };

      // Restore parsed items if constraints didn't have items
      if (parsedItems && !constraints.items) {
        propertySchema.items = parsedItems;
      }
    }

    // Ensure arrays always have items (required by OpenAI)
    if (propertySchema.type === 'array' && !propertySchema.items) {
      propertySchema.items = { type: 'string' };
    }

    properties[propertyName] = propertySchema;

    if (!isOptional) {
      required.push(propertyName);
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}
