/**
 * useToolInput - Access tool input arguments from the host
 * 
 * Returns the arguments passed to the tool that spawned this MCP App.
 * The host sends this via ui/notifications/tool-input after initialization.
 */
import { useMcpApp } from './AppProvider';

export interface UseToolInputReturn<T = Record<string, unknown>> {
    /** The tool input arguments, typed as T */
    input: T | null;
    /** Whether input has been received */
    hasInput: boolean;
}

/**
 * Hook to access tool input arguments from host
 * 
 * @example
 * ```tsx
 * function WeatherCard() {
 *   const { input } = useToolInput<{ city: string }>();
 *   
 *   if (!input) return <div>Loading...</div>;
 *   
 *   return <div>Weather for: {input.city}</div>;
 * }
 * ```
 */
export function useToolInput<T = Record<string, unknown>>(): UseToolInputReturn<T> {
    const { toolInput } = useMcpApp();

    return {
        input: toolInput as T | null,
        hasInput: toolInput !== null,
    };
}
