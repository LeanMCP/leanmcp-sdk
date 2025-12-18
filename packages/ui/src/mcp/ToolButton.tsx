/**
 * ToolButton - A button specifically designed for MCP tool invocation
 * 
 * Features:
 * - Automatic loading state during tool execution
 * - Result display (inline, toast, modal)
 * - Confirmation dialog support
 * - Render props for custom rendering
 * - Full accessibility
 * 
 * @example Simple tool call
 * ```tsx
 * <ToolButton tool="refresh-data">
 *   Refresh
 * </ToolButton>
 * ```
 * 
 * @example With result toast
 * ```tsx
 * <ToolButton 
 *   tool="create-order" 
 *   args={{ product: 'shoes' }}
 *   resultDisplay="toast"
 *   onToolSuccess={(order) => navigate(`/orders/${order.id}`)}
 * >
 *   Place Order
 * </ToolButton>
 * ```
 * 
 * @example With confirmation
 * ```tsx
 * <ToolButton 
 *   tool="delete-item" 
 *   args={{ id: item.id }}
 *   confirm={{ 
 *     title: 'Delete Item?',
 *     description: 'This action cannot be undone.' 
 *   }}
 *   variant="destructive"
 * >
 *   Delete
 * </ToolButton>
 * ```
 * 
 * @example Render props
 * ```tsx
 * <ToolButton tool="process-data">
 *   {({ loading, result, error }) => (
 *     loading ? <Spinner /> : result ? '✓ Done' : 'Process'
 *   )}
 * </ToolButton>
 * ```
 */
'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTool } from './useTool';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { VariantProps } from 'class-variance-authority';
import type { ToolBinding, ConfirmConfig, ToolState } from '@/types/mcp-types';

/**
 * State exposed to render props
 */
export interface ToolButtonState {
    /** Whether tool is currently executing */
    loading: boolean;
    /** Current tool state */
    state: ToolState;
    /** Result from last successful call */
    result: unknown | null;
    /** Error from last failed call */
    error: Error | null;
    /** Whether we have any result */
    hasResult: boolean;
}

/**
 * ToolButton props
 */
export interface ToolButtonProps
    extends Omit<React.ComponentProps<'button'>, 'children'>,
    VariantProps<typeof buttonVariants> {
    /** Tool to call on click - string or full config */
    tool: string | ToolBinding;
    /** Tool arguments */
    args?: Record<string, unknown>;

    // Result handling
    /** How to display result: 'inline' | 'toast' | 'modal' | 'none' */
    resultDisplay?: 'inline' | 'toast' | 'modal' | 'none';
    /** Custom result renderer */
    renderResult?: (result: unknown) => React.ReactNode;
    /** Duration to show result (for inline/toast) in ms */
    resultDuration?: number;
    /** Success message for toast */
    successMessage?: string | ((result: unknown) => string);
    /** Error message for toast */
    errorMessage?: string | ((error: Error) => string);

    // Callbacks
    /** Called when tool starts executing */
    onToolStart?: () => void;
    /** Called on successful result */
    onToolSuccess?: (result: unknown) => void;
    /** Called on error */
    onToolError?: (error: Error) => void;
    /** Called after completion (success or error) */
    onToolComplete?: () => void;

    // Loading customization
    /** Text to show while loading */
    loadingText?: string;
    /** Custom loading icon */
    loadingIcon?: React.ReactNode;
    /** Disable button while loading (default: true) */
    disableWhileLoading?: boolean;

    // Confirmation
    /** Require confirmation before calling */
    confirm?: boolean | ConfirmConfig;

    // Content
    /** Button content - can be ReactNode or render function */
    children?: React.ReactNode | ((state: ToolButtonState) => React.ReactNode);

    /** Use Radix Slot for composition */
    asChild?: boolean;
}

/**
 * ToolButton component
 */
export function ToolButton({
    tool,
    args = {},
    resultDisplay = 'none',
    renderResult,
    resultDuration = 3000,
    successMessage,
    errorMessage,
    onToolStart,
    onToolSuccess,
    onToolError,
    onToolComplete,
    loadingText,
    loadingIcon,
    disableWhileLoading = true,
    confirm,
    children,
    className,
    variant = 'default',
    size = 'default',
    disabled,
    asChild = false,
    ...props
}: ToolButtonProps) {
    // Normalize tool config
    const toolConfig = typeof tool === 'string' ? { name: tool } : tool;
    const mergedArgs = { ...toolConfig.args, ...args };

    // Tool hook
    const { call, state, loading, result, error, reset } = useTool(toolConfig.name, {
        defaultArgs: mergedArgs,
        transform: toolConfig.transform,
        onStart: onToolStart,
        onSuccess: onToolSuccess,
        onError: onToolError,
        onComplete: onToolComplete,
    });

    // Local state
    const [showConfirm, setShowConfirm] = useState(false);
    const [showResult, setShowResult] = useState(false);

    // Compute button state for render props
    const buttonState: ToolButtonState = {
        loading,
        state,
        result,
        error,
        hasResult: result !== null || error !== null,
    };

    /**
     * Execute the tool call
     */
    const executeCall = useCallback(async () => {
        try {
            const res = await call();

            // Handle result display
            if (resultDisplay === 'toast') {
                const message = typeof successMessage === 'function'
                    ? successMessage(res)
                    : successMessage ?? 'Success';
                toast.success(message);
            } else if (resultDisplay === 'inline') {
                setShowResult(true);
                setTimeout(() => setShowResult(false), resultDuration);
            }
        } catch (err) {
            if (resultDisplay === 'toast') {
                const message = typeof errorMessage === 'function'
                    ? errorMessage(err instanceof Error ? err : new Error(String(err)))
                    : errorMessage ?? (err instanceof Error ? err.message : 'An error occurred');
                toast.error(message);
            } else if (resultDisplay === 'inline') {
                setShowResult(true);
                setTimeout(() => setShowResult(false), resultDuration);
            }
        }
    }, [call, resultDisplay, successMessage, errorMessage, resultDuration]);

    /**
     * Handle click - show confirm or execute
     */
    const handleClick = useCallback(() => {
        if (confirm) {
            setShowConfirm(true);
        } else {
            executeCall();
        }
    }, [confirm, executeCall]);

    /**
     * Handle confirm
     */
    const handleConfirm = useCallback(() => {
        setShowConfirm(false);
        executeCall();
    }, [executeCall]);

    // Confirm dialog config
    const confirmConfig: ConfirmConfig = typeof confirm === 'object'
        ? confirm
        : {
            title: 'Confirm Action',
            description: 'Are you sure you want to proceed?',
            confirmText: 'Confirm',
            cancelText: 'Cancel',
        };

    // Render children
    const renderChildren = () => {
        if (typeof children === 'function') {
            return children(buttonState);
        }

        if (loading) {
            return (
                <>
                    {loadingIcon ?? <Loader2 className="animate-spin" />}
                    {loadingText && <span>{loadingText}</span>}
                    {!loadingText && children}
                </>
            );
        }

        if (showResult && resultDisplay === 'inline') {
            if (error) {
                return (
                    <>
                        <X className="text-destructive" />
                        <span>{error.message}</span>
                    </>
                );
            }
            if (renderResult) {
                return renderResult(result);
            }
            return (
                <>
                    <Check className="text-success" />
                    <span>Done</span>
                </>
            );
        }

        return children;
    };

    return (
        <>
            <Button
                type="button"
                variant={variant}
                size={size}
                className={cn(className)}
                disabled={disabled || (disableWhileLoading && loading)}
                onClick={handleClick}
                asChild={asChild}
                {...props}
            >
                {renderChildren()}
            </Button>

            {/* Confirmation Dialog */}
            {confirm && (
                <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{confirmConfig.title}</DialogTitle>
                            {confirmConfig.description && (
                                <DialogDescription>
                                    {confirmConfig.description}
                                </DialogDescription>
                            )}
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setShowConfirm(false)}
                            >
                                {confirmConfig.cancelText ?? 'Cancel'}
                            </Button>
                            <Button
                                variant={confirmConfig.confirmVariant ?? (variant === 'destructive' ? 'destructive' : 'default')}
                                onClick={handleConfirm}
                            >
                                {confirmConfig.confirmText ?? 'Confirm'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
