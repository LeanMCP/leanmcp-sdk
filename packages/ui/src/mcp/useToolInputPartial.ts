/**
 * useToolInputPartial - Access streaming partial tool input
 * 
 * This hook provides access to partial/streaming tool input arguments
 * as they are being typed or generated. Useful for progressive rendering
 * during tool call initialization.
 */
import { useMcpApp } from './AppProvider';

export interface UseToolInputPartialReturn {
    /** Partial arguments currently available */
    partialArgs: Record<string, unknown> | null;
    /** Whether partial args are being received */
    isStreaming: boolean;
}

/**
 * Hook to access streaming partial tool input
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { partialArgs, isStreaming } = useToolInputPartial();
 *   
 *   if (isStreaming) {
 *     return <div>Receiving: {JSON.stringify(partialArgs)}</div>;
 *   }
 *   return <div>Ready for input</div>;
 * }
 * ```
 */
export function useToolInputPartial(): UseToolInputPartialReturn {
    const { toolInputPartial } = useMcpApp();

    return {
        partialArgs: toolInputPartial,
        isStreaming: toolInputPartial !== null,
    };
}
