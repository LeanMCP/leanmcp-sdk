import 'reflect-metadata';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * AsyncLocalStorage for request-scoped environment variable storage
 * Each request has its own isolated env context, preventing race conditions
 */
const envStorage = new AsyncLocalStorage<Record<string, string>>();

/**
 * Run a function with the given environment variables in scope
 * @param env - Environment variables to make available via getEnv()
 * @param fn - Function to execute with the env context
 */
export function runWithEnv<T>(
  env: Record<string, string>,
  fn: () => T | Promise<T>
): T | Promise<T> {
  return envStorage.run(env, fn);
}

/**
 * Check if we're currently inside an env context
 */
export function hasEnvContext(): boolean {
  return envStorage.getStore() !== undefined;
}

/**
 * Get an environment variable from the current request context
 *
 * IMPORTANT: This function requires @Authenticated(authProvider, { projectId: '...' })
 * to be configured. Throws an error if called outside of an env context.
 *
 * @param key - Environment variable key
 * @returns The value or undefined if the key doesn't exist
 * @throws Error if called outside of env context (projectId not configured)
 */
export function getEnv(key: string): string | undefined {
  const store = envStorage.getStore();
  if (store === undefined) {
    throw new Error(
      `getEnv("${key}") called outside of env context. ` +
        `To use getEnv(), you must configure 'projectId' in your @Authenticated decorator: ` +
        `@Authenticated(authProvider, { projectId: 'your-project-id' })`
    );
  }
  return store[key];
}

/**
 * Get all environment variables from the current request context
 *
 * IMPORTANT: This function requires @Authenticated(authProvider, { projectId: '...' })
 * to be configured. Throws an error if called outside of an env context.
 *
 * @returns A copy of all environment variables
 * @throws Error if called outside of env context (projectId not configured)
 */
export function getAllEnv(): Record<string, string> {
  const store = envStorage.getStore();
  if (store === undefined) {
    throw new Error(
      `getAllEnv() called outside of env context. ` +
        `To use getAllEnv(), you must configure 'projectId' in your @Authenticated decorator: ` +
        `@Authenticated(authProvider, { projectId: 'your-project-id' })`
    );
  }
  return { ...store };
}
