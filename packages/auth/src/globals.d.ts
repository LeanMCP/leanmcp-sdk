/**
 * Global type declarations for @leanmcp/auth
 * 
 * This file makes the 'authUser' variable available in authenticated methods
 * without TypeScript errors.
 */

declare global {
  /**
   * Authenticated user object automatically injected by @Authenticated decorator
   * 
   * This variable is only available inside methods decorated with @Authenticated
   * when getUser option is true (default).
   * 
   * The structure of this object depends on your auth provider:
   * - Auth0: Contains sub, email, name, etc.
   * - Clerk: Contains userId, email, firstName, lastName, etc.
   * - Cognito: Contains sub, email, cognito:username, etc.
   * 
   * @example
   * ```typescript
   * @Tool({ description: 'Create post' })
   * @Authenticated(authProvider)
   * async createPost(args: CreatePostInput) {
   *   console.log('User ID:', authUser.sub);
   *   console.log('Email:', authUser.email);
   *   return { authorId: authUser.sub };
   * }
   * ```
   */
  var authUser: any;
}

export {};
