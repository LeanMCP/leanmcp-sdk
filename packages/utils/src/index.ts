/**
 * @leanmcp/utils - Utility Functions
 * 
 * This module provides helper utilities and shared functions across the LeanMCP SDK.
 * 
 * Status: Planned - Coming soon!
 */

/**
 * Validate JSON against a schema
 */
export function validateSchema(data: any, schema: any): { valid: boolean; errors?: any[] } {
  // TODO: Implement schema validation
  return { valid: true };
}

/**
 * Format response based on render type
 */
export function formatResponse(data: any, format: string): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'markdown':
      return typeof data === 'string' ? data : `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
    case 'html':
      return typeof data === 'string' ? data : `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    case 'table':
      return formatAsTable(data);
    default:
      return String(data);
  }
}

/**
 * Format data as a markdown table
 */
export function formatAsTable(data: any[]): string {
  if (!Array.isArray(data) || data.length === 0) {
    return String(data);
  }

  const keys = Object.keys(data[0]);
  const header = `| ${keys.join(' | ')} |`;
  const separator = `| ${keys.map(() => '---').join(' | ')} |`;
  const rows = data.map(row => `| ${keys.map(key => row[key]).join(' | ')} |`);

  return [header, separator, ...rows].join('\n');
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key] as any);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * Check if value is a plain object
 */
export function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; delayMs?: number; backoff?: number } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, backoff = 2 } = options;
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await sleep(delayMs * Math.pow(backoff, i));
      }
    }
  }

  throw lastError!;
}

/**
 * Sleep for a given duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function(this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), waitMs);
  };
}

/**
 * Create a throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limitMs);
    }
  };
}

/**
 * Parse environment variables with type coercion
 */
export function parseEnv(value: string | undefined, defaultValue: any, type: 'string' | 'number' | 'boolean' = 'string'): any {
  if (value === undefined) return defaultValue;

  switch (type) {
    case 'number':
      const num = Number(value);
      return isNaN(num) ? defaultValue : num;
    case 'boolean':
      return value.toLowerCase() === 'true';
    case 'string':
    default:
      return value;
  }
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

/**
 * Truncate string to max length
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Convert camelCase to kebab-case
 */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Convert kebab-case to camelCase
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
