import 'reflect-metadata';
import { hasEnvContext, getEnv } from './env-context';

// Metadata keys
const REQUIRE_ENV_KEY = Symbol('requireEnv');

/**
 * Decorator to validate required environment variables exist before method execution
 *
 * IMPORTANT: This decorator REQUIRES @Authenticated(authProvider, { projectId: '...' })
 * to be applied either on the method or on the enclosing class. This is validated at
 * runtime when the method is called.
 *
 * @param keys - List of required environment variable keys
 *
 * @example
 * ```typescript
 * @Authenticated(authProvider, { projectId: 'my-project' })
 * class SlackService {
 *   @Tool("Send Slack message")
 *   @RequireEnv(["SLACK_TOKEN", "SLACK_CHANNEL"])
 *   async sendMessage({ message }: { message: string }) {
 *     const token = getEnv("SLACK_TOKEN"); // User's token, not global
 *     const channel = getEnv("SLACK_CHANNEL");
 *     // ... send message
 *   }
 * }
 * ```
 */
export function RequireEnv(keys: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Store the required keys in metadata for later validation
    Reflect.defineMetadata(REQUIRE_ENV_KEY, keys, target, propertyKey);

    // Wrap the original method
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // First, check if env context is active (projectId was configured)
      if (!hasEnvContext()) {
        const className = target.constructor?.name || target.name || 'Unknown';
        throw new Error(
          `Environment injection not configured for ${className}.${propertyKey}(). ` +
            `To use @RequireEnv, you must configure 'projectId' in your @Authenticated decorator: ` +
            `@Authenticated(authProvider, { projectId: 'your-project-id' })`
        );
      }

      // Check for missing environment variables
      const missing = keys.filter((key) => !getEnv(key));

      if (missing.length > 0) {
        throw new Error(
          `Missing required environment variables: ${missing.join(', ')}. ` +
            `Please configure these secrets in your LeanMCP dashboard for this project.`
        );
      }

      // Execute the original method
      return originalMethod.apply(this, args);
    };

    // Preserve method metadata
    copyMethodMetadata(originalMethod, descriptor.value);

    return descriptor;
  };
}

/**
 * Get the required env keys for a method
 */
export function getRequiredEnvKeys(target: any, propertyKey: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_ENV_KEY, target, propertyKey);
}

/**
 * Check if a method has @RequireEnv decorator
 */
export function hasRequireEnv(target: any, propertyKey: string): boolean {
  return Reflect.hasMetadata(REQUIRE_ENV_KEY, target, propertyKey);
}

/**
 * Copy metadata from source to target function
 */
function copyMethodMetadata(source: Function, target: Function) {
  const metadataKeys = Reflect.getMetadataKeys(source);
  for (const key of metadataKeys) {
    const value = Reflect.getMetadata(key, source);
    Reflect.defineMetadata(key, value, target);
  }
}
