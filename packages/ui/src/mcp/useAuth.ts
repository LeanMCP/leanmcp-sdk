/**
 * useAuth - Authentication hook for GPT Apps
 *
 * Provides auth status and triggers ChatGPT's OAuth linking UI
 * when tools return _meta["mcp/www_authenticate"].
 */

import { useState, useEffect, useCallback } from 'react';
import { useGptApp } from './GPTAppProvider';

/**
 * Authenticated user info
 */
export interface AuthUser {
  /** User ID (subject) */
  id: string;
  /** Display name */
  name?: string;
  /** Email address */
  email?: string;
  /** Profile picture URL */
  picture?: string;
}

/**
 * Return type for useAuth hook
 */
export interface UseAuthReturn {
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Currently authenticated user (if any) */
  user: AuthUser | null;
  /** Loading state */
  loading: boolean;
  /** Authentication error (if any) */
  error: Error | null;
  /** Trigger an auth-required tool to initiate OAuth flow */
  triggerAuth: () => Promise<void>;
  /** Clear auth state (for sign-out UI) */
  clearAuth: () => void;
}

/**
 * Authentication hook for GPT Apps
 *
 * In ChatGPT, authentication is triggered automatically when a tool
 * returns `_meta["mcp/www_authenticate"]`. Use this hook to:
 *
 * 1. Check if the user is authenticated
 * 2. Show loading state during auth
 * 3. Display user info after auth
 * 4. Manually trigger auth by calling an auth-required tool
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, user, triggerAuth, loading } = useAuth();
 *
 *   if (loading) return <div>Authenticating...</div>;
 *
 *   if (!isAuthenticated) {
 *     return (
 *       <Button onClick={triggerAuth}>
 *         Sign in with GitHub
 *       </Button>
 *     );
 *   }
 *
 *   return <div>Welcome, {user?.name}!</div>;
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
  const { callTool, isConnected } = useGptApp();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Check auth status by calling a status tool (if available)
  const checkAuthStatus = useCallback(async () => {
    if (!isConnected) return;

    try {
      // Try to call a common auth status tool
      // The tool should return user info if authenticated,
      // or trigger OAuth if not
      const result = await callTool('getAuthStatus', {});

      if (result && result.user) {
        setIsAuthenticated(true);
        setUser(result.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (err: any) {
      // Tool not found or auth required - not authenticated
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [callTool, isConnected]);

  // Trigger authentication by calling an auth-required tool
  const triggerAuth = useCallback(async () => {
    if (!isConnected) {
      setError(new Error('Not connected to ChatGPT'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call a tool that requires auth
      // ChatGPT will automatically show OAuth UI if needed
      const result = await callTool('checkAuth', {});

      if (result && result.user) {
        setIsAuthenticated(true);
        setUser(result.user);
      } else if (result && result.success) {
        setIsAuthenticated(true);
        // Re-check status to get user info
        await checkAuthStatus();
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [callTool, isConnected, checkAuthStatus]);

  // Clear auth state (for sign-out)
  const clearAuth = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    setError(null);
  }, []);

  // Check status on mount
  useEffect(() => {
    if (isConnected) {
      // Don't block UI - check in background
      checkAuthStatus().catch(() => {
        // Silently fail - user not authenticated
      });
    }
  }, [isConnected, checkAuthStatus]);

  return {
    isAuthenticated,
    user,
    loading,
    error,
    triggerAuth,
    clearAuth,
  };
}
