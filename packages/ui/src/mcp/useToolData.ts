import { useOpenAiGlobal } from './useOpenAiGlobal';

/**
 * Access the structured content returned by the tool.
 * Maps to 'structuredContent' in the tool response.
 */
export function useToolOutput<T = any>(): T | undefined {
    return useOpenAiGlobal('toolOutput') as T;
}

/**
 * Access metadata about the tool response.
 * Maps to '_meta' in the tool response.
 */
export function useToolResponseMetadata<T = any>(): T | undefined {
    return useOpenAiGlobal('toolResponseMetadata') as T;
}

/**
 * Access the input arguments passed to the tool.
 */
export function useToolInput<T = any>(): T | undefined {
    return useOpenAiGlobal('toolInput') as T;
}
