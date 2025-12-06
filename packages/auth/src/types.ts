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

  /**
   * Project ID for fetching user environment variables.
   * Required when @RequireEnv is used on the method or class.
   * Used to scope user secrets to a specific project.
   */
  projectId?: string;
}
