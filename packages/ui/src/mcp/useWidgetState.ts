import { useCallback } from 'react';
import { useOpenAiGlobal } from './useOpenAiGlobal';

/**
 * Hook to read and write widget state.
 * Widget state persists across the session for this specific widget instance.
 * 
 * @param initialState - Default state if none exists
 */
export function useWidgetState<T extends Record<string, unknown>>(
    initialState: T | (() => T)
): [T, (newState: T | ((prev: T) => T)) => void] {
    const rawState = useOpenAiGlobal('widgetState') as T | undefined;

    // Resolve initial state
    const resolvedInitial = rawState ?? (
        typeof initialState === 'function'
            ? (initialState as () => T)()
            : initialState
    );

    const setWidgetState = useCallback((
        newStateOrUpdater: T | ((prev: T) => T)
    ) => {
        if (!window.openai?.setWidgetState) {
            console.warn('window.openai.setWidgetState is not available');
            return;
        }

        // Get current state from window.openai to ensure freshness, or fallback to our resolved initial
        const current = (window.openai.widgetState as T) ?? resolvedInitial;

        const next = typeof newStateOrUpdater === 'function'
            ? (newStateOrUpdater as (prev: T) => T)(current)
            : newStateOrUpdater;

        // Persist to host
        window.openai.setWidgetState(next);
    }, [resolvedInitial]);

    return [resolvedInitial, setWidgetState];
}
