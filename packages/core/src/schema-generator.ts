import "reflect-metadata";

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
    const propertyType = Reflect.getMetadata("design:type", instance, propertyName);
    
    // Convert TypeScript type to JSON Schema type
    let jsonSchemaType = "any";
    if (propertyType) {
      switch (propertyType.name) {
        case "String":
          jsonSchemaType = "string";
          break;
        case "Number":
          jsonSchemaType = "number";
          break;
        case "Boolean":
          jsonSchemaType = "boolean";
          break;
        case "Array":
          jsonSchemaType = "array";
          break;
        case "Object":
          jsonSchemaType = "object";
          break;
        default:
          jsonSchemaType = "object";
      }
    }
    
    properties[propertyName] = { type: jsonSchemaType };
    
    // Check if property is required (not optional)
    // In TypeScript, optional properties have '?' in declaration
    // We'll assume all properties without default values are required
    const descriptor = Object.getOwnPropertyDescriptor(instance, propertyName);
    if (descriptor && descriptor.value === undefined) {
      // Property has no default value, check if it's required
      const isOptional = propertyName.endsWith("?") || 
                        Reflect.getMetadata("optional", instance, propertyName);
      if (!isOptional) {
        required.push(propertyName);
      }
    }
  }
  
  return {
    type: "object",
    properties,
    required: required.length > 0 ? required : undefined
  };
}

/**
 * Property decorator to mark a field as optional in JSON Schema
 */
export function Optional(): PropertyDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata("optional", true, target, propertyKey);
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
}): PropertyDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata("schema:constraints", constraints, target, propertyKey);
  };
}

/**
 * Enhanced schema generator that includes constraints
 */
export function classToJsonSchemaWithConstraints(classConstructor: new () => any): any {
  const instance = new classConstructor();
  const properties: Record<string, any> = {};
  const required: string[] = [];
  
  const propertyNames = Object.keys(instance);
  
  for (const propertyName of propertyNames) {
    const propertyType = Reflect.getMetadata("design:type", instance, propertyName);
    const constraints = Reflect.getMetadata("schema:constraints", instance, propertyName);
    const isOptional = Reflect.getMetadata("optional", instance, propertyName);
    
    let jsonSchemaType = "any";
    if (propertyType) {
      switch (propertyType.name) {
        case "String":
          jsonSchemaType = "string";
          break;
        case "Number":
          jsonSchemaType = "number";
          break;
        case "Boolean":
          jsonSchemaType = "boolean";
          break;
        case "Array":
          jsonSchemaType = "array";
          break;
        case "Object":
          jsonSchemaType = "object";
          break;
        default:
          jsonSchemaType = "object";
      }
    }
    
    properties[propertyName] = {
      type: jsonSchemaType,
      ...(constraints || {})
    };
    
    if (!isOptional) {
      required.push(propertyName);
    }
  }
  
  return {
    type: "object",
    properties,
    required: required.length > 0 ? required : undefined
  };
}
