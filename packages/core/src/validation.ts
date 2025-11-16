/**
 * Input validation utilities for LeanMCP
 * Provides secure validation for common input types
 */

/**
 * Validates that a port number is within valid range (1-65535)
 * 
 * @param port - Port number to validate
 * @throws {Error} If port is invalid
 * 
 * @example
 * ```typescript
 * validatePort(3000); // OK
 * validatePort(0);    // Throws error
 * validatePort(70000); // Throws error
 * ```
 */
export function validatePort(port: number): void {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${port}. Must be an integer between 1-65535`);
  }
}

/**
 * Validates that a file path doesn't contain directory traversal patterns
 * Prevents path traversal attacks by checking for '..' and '~'
 * 
 * @param path - File path to validate
 * @throws {Error} If path contains unsafe patterns
 * 
 * @example
 * ```typescript
 * validatePath('./services'); // OK
 * validatePath('../etc/passwd'); // Throws error
 * validatePath('~/secrets'); // Throws error
 * ```
 */
export function validatePath(path: string): void {
  if (path.includes('..') || path.includes('~')) {
    throw new Error(`Invalid path: ${path}. Path traversal patterns are not allowed`);
  }
}

/**
 * Validates that a service name contains only safe characters
 * Allows alphanumeric, hyphens, and underscores only
 * 
 * @param name - Service name to validate
 * @throws {Error} If name contains unsafe characters
 * 
 * @example
 * ```typescript
 * validateServiceName('my-service'); // OK
 * validateServiceName('my_service_123'); // OK
 * validateServiceName('my service'); // Throws error
 * validateServiceName('../malicious'); // Throws error
 * ```
 */
export function validateServiceName(name: string): void {
  const validNamePattern = /^[a-zA-Z0-9_-]+$/;
  if (!validNamePattern.test(name)) {
    throw new Error(
      `Invalid service name: ${name}. Service names must contain only alphanumeric characters, hyphens, and underscores`
    );
  }
}

/**
 * Validates that a string is not empty or only whitespace
 * 
 * @param value - String to validate
 * @param fieldName - Name of the field for error message
 * @throws {Error} If string is empty or only whitespace
 * 
 * @example
 * ```typescript
 * validateNonEmpty('hello', 'name'); // OK
 * validateNonEmpty('', 'name'); // Throws error
 * validateNonEmpty('   ', 'name'); // Throws error
 * ```
 */
export function validateNonEmpty(value: string, fieldName: string): void {
  if (!value || value.trim().length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
}

/**
 * Validates that a URL is well-formed and uses allowed protocols
 * 
 * @param url - URL to validate
 * @param allowedProtocols - Array of allowed protocols (default: ['http:', 'https:'])
 * @throws {Error} If URL is invalid or uses disallowed protocol
 * 
 * @example
 * ```typescript
 * validateUrl('https://example.com'); // OK
 * validateUrl('http://localhost:3000'); // OK
 * validateUrl('file:///etc/passwd'); // Throws error
 * validateUrl('javascript:alert(1)'); // Throws error
 * ```
 */
export function validateUrl(url: string, allowedProtocols: string[] = ['http:', 'https:']): void {
  try {
    const parsed = new URL(url);
    if (!allowedProtocols.includes(parsed.protocol)) {
      throw new Error(
        `Invalid URL protocol: ${parsed.protocol}. Allowed protocols: ${allowedProtocols.join(', ')}`
      );
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Invalid URL: ${url}`);
    }
    throw error;
  }
}
