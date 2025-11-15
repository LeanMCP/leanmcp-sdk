import "reflect-metadata";
import { AuthProviderBase } from "./index";

/**
 * Authentication error class for better error handling
 */
export class AuthenticationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Decorator to protect MCP tools, prompts, resources, or entire services with authentication
 * 
 * Usage:
 * 
 * 1. Protect individual methods:
 * ```typescript
 * @Tool({ description: 'Analyze sentiment' })
 * @Authenticated(authProvider)
 * async analyzeSentiment(args: AnalyzeSentimentInput): Promise<AnalyzeSentimentOutput> {
 *   // This method requires authentication
 * }
 * ```
 * 
 * 2. Protect entire service (all tools/prompts/resources):
 * ```typescript
 * @Authenticated(authProvider)
 * export class SentimentAnalysisService {
 *   @Tool({ description: 'Analyze sentiment' })
 *   async analyzeSentiment(args: AnalyzeSentimentInput) {
 *     // All methods in this service require authentication
 *   }
 * }
 * ```
 * 
 * The decorator expects authentication token in the MCP request _meta field:
 * ```json
 * {
 *   "method": "tools/call",
 *   "params": {
 *     "name": "toolName",
 *     "arguments": { ...businessData },
 *     "_meta": {
 *       "authorization": {
 *         "type": "bearer",
 *         "token": "your-jwt-token"
 *       }
 *     }
 *   }
 * }
 * ```
 * 
 * @param authProvider - Instance of AuthProviderBase to use for token verification
 */
export function Authenticated(authProvider: AuthProviderBase) {
  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    // Case 1: Applied to a class (protect all methods)
    if (!propertyKey && !descriptor) {
      // Store auth provider on the class
      Reflect.defineMetadata("auth:provider", authProvider, target);
      Reflect.defineMetadata("auth:required", true, target);
      
      // Get all method names from the prototype
      const prototype = target.prototype;
      const methodNames = Object.getOwnPropertyNames(prototype).filter(
        name => name !== 'constructor' && typeof prototype[name] === 'function'
      );
      
      // Wrap each method with authentication
      for (const methodName of methodNames) {
        const originalDescriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
        if (originalDescriptor && typeof originalDescriptor.value === 'function') {
          const originalMethod = originalDescriptor.value;
          
          // Store auth metadata on the method
          Reflect.defineMetadata("auth:provider", authProvider, originalMethod);
          Reflect.defineMetadata("auth:required", true, originalMethod);
          
          // Wrap the method with authentication logic
          prototype[methodName] = createAuthenticatedMethod(originalMethod, authProvider);
          
          // Copy metadata from original method to wrapped method
          copyMetadata(originalMethod, prototype[methodName]);
        }
      }
      
      return target;
    }
    
    // Case 2: Applied to a method
    if (descriptor && typeof descriptor.value === 'function') {
      const originalMethod = descriptor.value;
      
      // Store auth metadata on the method
      Reflect.defineMetadata("auth:provider", authProvider, originalMethod);
      Reflect.defineMetadata("auth:required", true, originalMethod);
      
      // Wrap the method with authentication logic
      descriptor.value = createAuthenticatedMethod(originalMethod, authProvider);
      
      // Copy metadata from original method to wrapped method
      copyMetadata(originalMethod, descriptor.value);
      
      return descriptor;
    }
    
    throw new Error("@Authenticated can only be applied to classes or methods");
  };
}

/**
 * Creates an authenticated wrapper around a method
 * Extracts token from _meta.authorization following MCP protocol standards
 */
function createAuthenticatedMethod(originalMethod: Function, authProvider: AuthProviderBase) {
  return async function (this: any, args: any, meta?: any) {
    // Extract token from _meta.authorization (MCP standard)
    const token = meta?.authorization?.token;
    
    // Check if token is provided
    if (!token) {
      throw new AuthenticationError(
        "Authentication required. Please provide a valid token in _meta.authorization.token",
        "MISSING_TOKEN"
      );
    }
    
    // Verify token using the auth provider
    try {
      const isValid = await authProvider.verifyToken(token);
      
      if (!isValid) {
        throw new AuthenticationError(
          "Invalid or expired token. Please authenticate again.",
          "INVALID_TOKEN"
        );
      }
    } catch (error) {
      // If it's already an AuthenticationError, rethrow it
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      // Otherwise, wrap the error
      throw new AuthenticationError(
        `Token verification failed: ${error instanceof Error ? error.message : String(error)}`,
        "VERIFICATION_FAILED"
      );
    }
    
    // Token is valid, proceed with the original method
    // Pass only the business arguments (no token in args)
    return originalMethod.apply(this, [args]);
  };
}

/**
 * Copy all metadata from source to target function
 */
function copyMetadata(source: Function, target: Function) {
  // Get all metadata keys
  const metadataKeys = Reflect.getMetadataKeys(source);
  
  // Copy each metadata key
  for (const key of metadataKeys) {
    const value = Reflect.getMetadata(key, source);
    Reflect.defineMetadata(key, value, target);
  }
  
  // Also copy design-time metadata (TypeScript emitted metadata)
  const designKeys = ['design:type', 'design:paramtypes', 'design:returntype'];
  for (const key of designKeys) {
    const value = Reflect.getMetadata(key, source);
    if (value !== undefined) {
      Reflect.defineMetadata(key, value, target);
    }
  }
}

/**
 * Check if a method or class requires authentication
 */
export function isAuthenticationRequired(target: any): boolean {
  return Reflect.getMetadata("auth:required", target) === true;
}

/**
 * Get the auth provider for a method or class
 */
export function getAuthProvider(target: any): AuthProviderBase | undefined {
  return Reflect.getMetadata("auth:provider", target);
}
