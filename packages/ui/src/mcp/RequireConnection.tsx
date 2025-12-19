/**
 * RequireConnection - Guard component for MCP connection state
 * 
 * Wraps content that requires an active MCP connection and shows
 * appropriate loading/error states.
 * 
 * @example Basic usage
 * ```tsx
 * <RequireConnection loading={<Skeleton />}>
 *   <ToolButton tool="refresh">Refresh</ToolButton>
 * </RequireConnection>
 * ```
 * 
 * @example Custom error handling
 * ```tsx
 * <RequireConnection 
 *   error={(err) => <Alert variant="destructive">{err.message}</Alert>}
 * >
 *   <MyToolComponent />
 * </RequireConnection>
 * ```
 */
'use client';

import * as React from 'react';
import { Loader2, AlertCircle, WifiOff } from 'lucide-react';
import { useMcpApp } from './AppProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * RequireConnection props
 */
export interface RequireConnectionProps {
    /** Loading fallback */
    loading?: React.ReactNode;
    /** Error fallback */
    error?: React.ReactNode | ((error: Error) => React.ReactNode);
    /** Disconnected fallback (different from error) */
    disconnected?: React.ReactNode;
    /** Content to render when connected */
    children: React.ReactNode;
    /** Additional className for wrapper */
    className?: string;
}

/**
 * Default loading component
 */
function DefaultLoading() {
    return (
        <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    );
}

/**
 * Default disconnected component
 */
function DefaultDisconnected() {
    return (
        <Alert>
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
                Waiting for connection to MCP host...
            </AlertDescription>
        </Alert>
    );
}

/**
 * Default error component
 */
function DefaultError({ error }: { error: Error }) {
    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
                Connection error: {error.message}
            </AlertDescription>
        </Alert>
    );
}

/**
 * RequireConnection component
 */
export function RequireConnection({
    loading: loadingContent,
    error: errorContent,
    disconnected: disconnectedContent,
    children,
    className,
}: RequireConnectionProps) {
    const { isConnected, error, app } = useMcpApp();

    // Debug logging
    console.log('[RequireConnection] State:', { hasApp: !!app, isConnected, hasError: !!error });

    // Still initializing (no app yet, no error)
    if (!app && !error && !isConnected) {
        console.log('[RequireConnection] Rendering: Initial Loading');
        if (loadingContent) {
            return <div className={className}>{loadingContent}</div>;
        }
        return (
            <div className={className}>
                <DefaultLoading />
            </div>
        );
    }

    // Error state
    if (error) {
        console.log('[RequireConnection] Rendering: Error');
        if (errorContent) {
            if (typeof errorContent === 'function') {
                return <div className={className}>{errorContent(error)}</div>;
            }
            return <div className={className}>{errorContent}</div>;
        }
        return (
            <div className={className}>
                <DefaultError error={error} />
            </div>
        );
    }

    // Not connected (but has app - transitional state)
    if (!isConnected) {
        console.log('[RequireConnection] Rendering: Disconnected/Loading');
        if (disconnectedContent) {
            return <div className={className}>{disconnectedContent}</div>;
        }
        if (loadingContent) {
            return <div className={className}>{loadingContent}</div>;
        }
        return (
            <div className={className}>
                <DefaultDisconnected />
            </div>
        );
    }

    // Connected - render children directly without wrapper
    console.log('[RequireConnection] Rendering: Children (Connected)');
    return <>{children}</>;
}
