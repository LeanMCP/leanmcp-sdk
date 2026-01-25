/**
 * ToolErrorBoundary - Error boundary for tool execution failures
 *
 * Catches errors from tool calls within its children and provides
 * a fallback UI with retry capability.
 *
 * @example Basic usage
 * ```tsx
 * <ToolErrorBoundary>
 *   <ToolButton tool="risky-operation">Do Something</ToolButton>
 * </ToolErrorBoundary>
 * ```
 *
 * @example Custom fallback
 * ```tsx
 * <ToolErrorBoundary
 *   fallback={(error, retry) => (
 *     <div>
 *       <p>Failed: {error.message}</p>
 *       <Button onClick={retry}>Try Again</Button>
 *     </div>
 *   )}
 * >
 *   <MyToolComponent />
 * </ToolErrorBoundary>
 * ```
 */
'use client';

import * as React from 'react';
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * ToolErrorBoundary props
 */
export interface ToolErrorBoundaryProps {
  /** Fallback UI on error */
  fallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
  /** Called on error */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Reset error on these props changing */
  resetKeys?: unknown[];
  /** Children to render */
  children: ReactNode;
}

/**
 * ToolErrorBoundary state
 */
interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Default fallback component
 */
function DefaultFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p className="text-sm">{error.message}</p>
        <Button variant="outline" size="sm" onClick={onRetry} className="w-fit">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * ToolErrorBoundary component
 */
export class ToolErrorBoundary extends Component<ToolErrorBoundaryProps, State> {
  constructor(props: ToolErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ToolErrorBoundaryProps) {
    // Reset on resetKeys change
    if (
      this.state.hasError &&
      this.props.resetKeys &&
      prevProps.resetKeys &&
      this.props.resetKeys.some((key, index) => key !== prevProps.resetKeys?.[index])
    ) {
      this.reset();
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { fallback, children } = this.props;

    if (hasError && error) {
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error, this.reset);
        }
        return fallback;
      }
      return <DefaultFallback error={error} onRetry={this.reset} />;
    }

    return children;
  }
}
