/**
 * Shared types for @leanmcp/auth
 */

/**
 * Options for the Authenticated decorator
 */
export interface AuthenticatedOptions {
  /**
   * Whether to fetch and attach user information to authUser variable
   * @default true
   */
  getUser?: boolean;
}
