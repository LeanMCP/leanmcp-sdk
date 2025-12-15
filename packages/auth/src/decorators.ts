import "reflect-metadata";
import { AsyncLocalStorage } from "async_hooks";
import { AuthProviderBase } from "./index";
import type { AuthenticatedOptions } from "./types";

/**
 * Global authUser type declaration
 * This makes authUser available in @Authenticated methods without explicit declaration
 */
declare global {
  /**
   * Authenticated user object automatically available in @Authenticated methods
   * 
   * Implemented as a getter that reads from AsyncLocalStorage for concurrency safety.
   * Each request has its own isolated context - 100% safe for concurrent requests.
   */
  const authUser: any;
}

/**
 * AsyncLocalStorage for request-scoped authUser storage
 * This ensures each request has its own isolated authUser context,
 * preventing race conditions in concurrent request scenarios
 */
const authUserStorage = new AsyncLocalStorage<any>();

/**
 * Get the current authenticated user from the async context
 * This is safe for concurrent requests as each request has its own context
 */
export function getAuthUser(): any {
  return authUserStorage.getStore();
}

/**
 * Define authUser as a global getter that reads from AsyncLocalStorage
 * This makes authUser truly concurrency-safe while maintaining the global variable API
 */
if (typeof globalThis !== 'undefined' && !Object.getOwnPropertyDescriptor(globalThis, 'authUser')) {
  Object.defineProperty(globalThis, 'authUser', {
    get() {
      return authUserStorage.getStore();
    },
    configurable: true,
    enumerable: false
  });
}

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
 * CONCURRENCY SAFE: Uses AsyncLocalStorage to ensure each request has its own isolated
 * authUser context, preventing race conditions in high-concurrency scenarios.
 * 
 * Usage:
 * 
 * 1. Protect individual methods with automatic user info:
 * ```typescript
 * @Tool({ description: 'Analyze sentiment' })
 * @Authenticated(authProvider, { getUser: true })
 * async analyzeSentiment(args: AnalyzeSentimentInput): Promise<AnalyzeSentimentOutput> {
 *   // authUser is automatically available in method scope
 *   console.log('User:', authUser);
 *   console.log('User ID:', authUser.sub);
 * }
 * ```
 * 
 * 2. Protect without fetching user info:
 * ```typescript
 * @Tool({ description: 'Public tool' })
 * @Authenticated(authProvider, { getUser: false })
 * async publicTool(args: PublicToolInput): Promise<PublicToolOutput> {
 *   // Only verifies token, doesn't fetch user info
 * }
 * ```
 * 
 * 3. Protect entire service (all tools/prompts/resources):
 * ```typescript
 * @Authenticated(authProvider)
 * export class SentimentAnalysisService {
 *   @Tool({ description: 'Analyze sentiment' })
 *   async analyzeSentiment(args: AnalyzeSentimentInput) {
 *     // All methods in this service require authentication
 *     // authUser is automatically available in all methods
 *     console.log('User:', authUser);
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
 * @param options - Optional configuration for authentication behavior
 */
export function Authenticated(authProvider: AuthProviderBase, options?: AuthenticatedOptions) {
  const authOptions: AuthenticatedOptions = { getUser: true, ...options };

  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    // Case 1: Applied to a class (protect all methods)
    if (!propertyKey && !descriptor) {
      // Store auth provider on the class
      Reflect.defineMetadata("auth:provider", authProvider, target);
      Reflect.defineMetadata("auth:required", true, target);
      Reflect.defineMetadata("auth:options", authOptions, target);

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
          Reflect.defineMetadata("auth:options", authOptions, originalMethod);

          // Wrap the method with authentication logic
          prototype[methodName] = createAuthenticatedMethod(originalMethod, authProvider, authOptions);

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
      Reflect.defineMetadata("auth:options", authOptions, originalMethod);

      // Wrap the method with authentication logic
      descriptor.value = createAuthenticatedMethod(originalMethod, authProvider, authOptions);

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
 * Optionally fetches and injects user information as 'authUser' variable in method scope
 * Optionally fetches user secrets and injects them via runWithEnv when projectId is provided
 */
function createAuthenticatedMethod(
  originalMethod: Function,
  authProvider: AuthProviderBase,
  options: AuthenticatedOptions
) {
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

    // Fetch user information if requested
    let user: any = undefined;
    if (options.getUser !== false) {
      try {
        user = await authProvider.getUser(token);
      } catch (error) {
        console.warn('Failed to fetch user information:', error);
      }
    }

    // Fetch user secrets if projectId is configured
    let userSecrets: Record<string, string> = {};
    if (options.projectId) {
      try {
        // Check if auth provider supports getUserSecrets (LeanMCP provider)
        if ('getUserSecrets' in authProvider && typeof (authProvider as any).getUserSecrets === 'function') {
          userSecrets = await (authProvider as any).getUserSecrets(token, options.projectId);
        } else {
          console.warn(
            '[Auth] Auth provider does not support user secrets. ' +
            'Only the LeanMCP provider supports @RequireEnv and getEnv(). ' +
            'Use: new AuthProvider("leanmcp", { apiKey: "..." })'
          );
        }
      } catch (error) {
        console.warn('[Auth] Failed to fetch user secrets:', error instanceof Error ? error.message : error);
      }
    }

    // Run the method within nested async contexts
    // 1. authUserStorage for authUser global
    // 2. envStorage for getEnv() (if projectId configured)
    return await authUserStorage.run(user, async () => {
      // If projectId is configured, always wrap with env context (even if empty)
      if (options.projectId) {
        // Dynamically import to avoid circular dependency
        const { runWithEnv } = await import('@leanmcp/env-injection');
        return await runWithEnv(userSecrets, async () => {
          return await originalMethod.apply(this, [args]);
        });
      }

      // No env injection needed
      return await originalMethod.apply(this, [args]);
    });
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
