/**
 * StreamingContent - Component for displaying streaming/partial tool input
 * 
 * MCP hosts can stream tool input progressively. This component provides
 * a declarative way to render both partial and complete data with
 * appropriate visual feedback.
 * 
 * @example Basic streaming display
 * ```tsx
 * <StreamingContent<WeatherData>>
 *   {(data, isComplete) => (
 *     <div className={isComplete ? '' : 'opacity-70'}>
 *       <h2>{data.location ?? 'Loading...'}</h2>
 *       {data.temperature && <p>{data.temperature}°C</p>}
 *     </div>
 *   )}
 * </StreamingContent>
 * ```
 * 
 * @example With custom loading
 * ```tsx
 * <StreamingContent 
 *   fallback={<WeatherSkeleton />}
 *   showProgress
 * >
 *   {(weather, isComplete) => <WeatherCard data={weather} />}
 * </StreamingContent>
 * ```
 */
'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { useToolStream } from './useToolStream';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/**
 * StreamingContent props
 */
export interface StreamingContentProps<T = unknown> {
    /** Fallback while no data available */
    fallback?: React.ReactNode;
    /** Show streaming progress indicator */
    showProgress?: boolean;
    /** Progress value (0-100) if known */
    progress?: number;
    /** Called with partial data updates */
    onPartial?: (data: Partial<T>) => void;
    /** Called when data is complete */
    onComplete?: (data: T) => void;
    /** Render function for data */
    children: (data: T | Partial<T>, isComplete: boolean) => React.ReactNode;
    /** Additional className */
    className?: string;
    /** Style to apply while streaming (e.g., opacity) */
    streamingStyle?: 'opacity' | 'blur' | 'none';
}

/**
 * StreamingContent component
 */
export function StreamingContent<T = unknown>({
    fallback,
    showProgress = false,
    progress: externalProgress,
    onPartial,
    onComplete,
    children,
    className,
    streamingStyle = 'opacity',
}: StreamingContentProps<T>) {
    const { partial, complete, isStreaming, isComplete } = useToolStream<T>({
        onPartial,
        onComplete,
    });

    // Determine which data to show
    const data = complete ?? partial;

    // No data yet
    if (!data) {
        if (fallback) {
            return <div className={className}>{fallback}</div>;
        }
        return (
            <div className={cn('flex items-center justify-center p-8', className)}>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Compute streaming styles
    const streamingClasses = cn(
        streamingStyle === 'opacity' && isStreaming && 'opacity-70',
        streamingStyle === 'blur' && isStreaming && 'blur-[1px]',
    );

    return (
        <div className={cn('relative', className)}>
            {/* Progress indicator */}
            {showProgress && isStreaming && (
                <div className="absolute top-0 left-0 right-0 z-10">
                    {externalProgress !== undefined ? (
                        <Progress value={externalProgress} className="h-1" />
                    ) : (
                        <div className="h-1 bg-primary/20 overflow-hidden">
                            <div className="h-full w-1/3 bg-primary animate-[shimmer_1s_infinite]" />
                        </div>
                    )}
                </div>
            )}

            {/* Streaming indicator badge */}
            {isStreaming && (
                <div className="absolute top-2 right-2 z-10">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Streaming...</span>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className={cn('transition-all duration-200', streamingClasses)}>
                {children(data, isComplete)}
            </div>
        </div>
    );
}
