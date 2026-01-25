/**
 * ResourceView - Component for displaying MCP server resources
 *
 * Provides a declarative way to fetch and display MCP resources
 * with loading states, error handling, and auto-refresh.
 *
 * @example Simple resource display
 * ```tsx
 * <ResourceView uri="user://profile">
 *   {(profile) => (
 *     <Card>
 *       <CardHeader title={profile.name} />
 *       <CardContent>{profile.bio}</CardContent>
 *     </Card>
 *   )}
 * </ResourceView>
 * ```
 *
 * @example With auto-refresh
 * ```tsx
 * <ResourceView uri="metrics://dashboard" refreshInterval={5000}>
 *   {(metrics, { refresh }) => (
 *     <div>
 *       <MetricsChart data={metrics} />
 *       <Button onClick={refresh}>Refresh Now</Button>
 *     </div>
 *   )}
 * </ResourceView>
 * ```
 *
 * @example Custom loading and error
 * ```tsx
 * <ResourceView
 *   uri="data://items"
 *   loading={<LoadingSkeleton />}
 *   error={(err) => <ErrorBanner message={err.message} />}
 * >
 *   {(items) => <ItemList items={items} />}
 * </ResourceView>
 * ```
 */
'use client';

import * as React from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useResource } from './useResource';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Resource metadata passed to children
 */
export interface ResourceMeta {
  /** Resource URI */
  uri: string;
  /** Refresh the resource */
  refresh: () => Promise<unknown>;
  /** Last updated timestamp */
  lastUpdated: Date | null;
  /** Whether currently refreshing */
  isRefreshing: boolean;
}

/**
 * ResourceView props
 */
export interface ResourceViewProps<T = unknown> {
  /** Resource URI */
  uri: string;
  /** Refresh interval in ms */
  refreshInterval?: number;
  /** Subscribe to updates (when supported) */
  subscribe?: boolean;
  /** Transform resource data */
  transform?: (data: unknown) => T;

  /** Loading placeholder */
  loading?: React.ReactNode;
  /** Error display */
  error?: React.ReactNode | ((error: Error, retry: () => void) => React.ReactNode);

  /** Render function for resource data */
  children: (data: T, meta: ResourceMeta) => React.ReactNode;

  /** Additional className */
  className?: string;

  /** Skip initial fetch */
  skip?: boolean;
}

/**
 * Default loading component
 */
function DefaultLoading() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

/**
 * Default error component
 */
function DefaultError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error loading resource</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <span>{error.message}</span>
        <Button variant="outline" size="sm" onClick={onRetry} className="w-fit">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * ResourceView component
 */
export function ResourceView<T = unknown>({
  uri,
  refreshInterval,
  subscribe,
  transform,
  loading: loadingContent,
  error: errorContent,
  children,
  className,
  skip = false,
}: ResourceViewProps<T>) {
  const { data, loading, error, refresh, lastUpdated } = useResource<T>(uri, {
    refreshInterval,
    subscribe,
    transform,
    skip,
  });

  // Build metadata for children
  const meta: ResourceMeta = {
    uri,
    refresh,
    lastUpdated,
    isRefreshing: loading && data !== null,
  };

  // Loading state (initial load only)
  if (loading && data === null) {
    if (loadingContent) {
      return <div className={className}>{loadingContent}</div>;
    }
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error && data === null) {
    if (errorContent) {
      if (typeof errorContent === 'function') {
        return <div className={className}>{errorContent(error, refresh)}</div>;
      }
      return <div className={className}>{errorContent}</div>;
    }
    return (
      <div className={className}>
        <DefaultError error={error} onRetry={refresh} />
      </div>
    );
  }

  // Render content
  if (data !== null) {
    return <div className={className}>{children(data, meta)}</div>;
  }

  // Fallback loading
  return <div className={className}>{loadingContent ?? <DefaultLoading />}</div>;
}
