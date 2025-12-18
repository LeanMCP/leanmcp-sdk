/**
 * ToolProvider - Scoped configuration provider for MCP tool components
 * 
 * Allows setting default behaviors for all tool components within its scope,
 * such as default result display, error handling, and loading states.
 * 
 * @example Set default toast display
 * ```tsx
 * <ToolProvider defaults={{ resultDisplay: { display: 'toast' } }}>
 *   <ToolButton tool="action1">Action 1</ToolButton>
 *   <ToolButton tool="action2">Action 2</ToolButton>
 *   {/* Both buttons will show toast on success *\/}
 * </ToolProvider>
 * ```
 * 
 * @example Global error handler
 * ```tsx
 * <ToolProvider 
 *   defaults={{ 
 *     onError: (err) => logError(err),
 *     showLoading: true 
 *   }}
 * >
 *   <MyApp />
 * </ToolProvider>
 * ```
 */
'use client';

import * as React from 'react';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ToolResultConfig, ToolProviderConfig } from '@/types/mcp-types';

/**
 * ToolContext value
 */
export interface ToolContextValue {
    /** Default result display configuration */
    resultDisplay: ToolResultConfig;
    /** Default error handler */
    onError?: (error: Error) => void;
    /** Show loading states globally */
    showLoading: boolean;
}

/**
 * Default context value
 */
const DEFAULT_CONTEXT: ToolContextValue = {
    resultDisplay: { display: 'none' },
    showLoading: true,
};

/**
 * Tool context
 */
const ToolContext = createContext<ToolContextValue>(DEFAULT_CONTEXT);

/**
 * ToolProvider props
 */
export interface ToolProviderProps {
    /** Default configuration for all tool components */
    defaults?: ToolProviderConfig;
    /** Children */
    children: ReactNode;
}

/**
 * ToolProvider component
 */
export function ToolProvider({
    defaults = {},
    children,
}: ToolProviderProps) {
    const parentContext = useContext(ToolContext);

    // Merge with parent context
    const value = useMemo<ToolContextValue>(() => ({
        resultDisplay: defaults.resultDisplay ?? parentContext.resultDisplay,
        onError: defaults.onError ?? parentContext.onError,
        showLoading: defaults.showLoading ?? parentContext.showLoading,
    }), [defaults, parentContext]);

    return (
        <ToolContext.Provider value={value}>
            {children}
        </ToolContext.Provider>
    );
}

/**
 * Hook to access tool context
 */
export function useToolContext(): ToolContextValue {
    return useContext(ToolContext);
}
