/**
 * GPTAppProvider - Context provider for ChatGPT Apps
 * 
 * Uses ChatGPT's native window.openai SDK instead of ext-apps.
 * This is the root provider specifically for @GPTApp components.
 */
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from 'react';

/**
 * ChatGPT's window.openai interface
 * Only includes properties that are confirmed to exist in the ChatGPT Apps SDK
 */
interface OpenAISDK {
    /** Call a server tool */
    callTool: (name: string, args: Record<string, unknown>) => Promise<any>;
    /** Current theme */
    theme?: 'light' | 'dark';
    /** Current locale */
    locale?: string;
    /** Display mode */
    displayMode?: 'inline' | 'modal' | 'fullscreen';
    /** Maximum height for the widget */
    maxHeight?: number;
}

declare global {
    interface Window {
        openai?: OpenAISDK;
    }
}

/**
 * GPT App context value - available via useGptApp()
 */
export interface GptAppContextValue {
    /** Whether connected to ChatGPT host */
    isConnected: boolean;
    /** Connection error, if any */
    error: Error | null;
    /** Theme from host */
    theme: 'light' | 'dark';
    /** Display mode */
    displayMode: string;
    /** Locale */
    locale: string;
    /** Max height from host */
    maxHeight: number;
    /** Call a server tool via ChatGPT */
    callTool: (name: string, args?: Record<string, unknown>) => Promise<any>;
}

export const GptAppContext = createContext<GptAppContextValue | null>(null);

export interface GPTAppProviderProps {
    /** App name */
    appName: string;
    /** React children */
    children: ReactNode;
}

/**
 * GPTAppProvider - Root context for ChatGPT Apps
 * 
 * Uses ChatGPT's native window.openai SDK for host communication.
 * 
 * @example
 * ```tsx
 * function MyGPTApp() {
 *   return (
 *     <GPTAppProvider appName="MyApp">
 *       <MyContent />
 *     </GPTAppProvider>
 *   );
 * }
 * ```
 */
export function GPTAppProvider({ appName, children }: GPTAppProviderProps) {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [displayMode, setDisplayMode] = useState('inline');
    const [locale, setLocale] = useState('en');
    const [maxHeight, setMaxHeight] = useState(600);

    // Initialize connection to ChatGPT host
    useEffect(() => {
        let mounted = true;
        let checkAttempts = 0;
        const maxAttempts = 50; // 5 seconds total

        function checkConnection() {
            if (!mounted) return;

            if (window.openai) {
                // Connected to ChatGPT
                setIsConnected(true);
                setError(null);

                // Read initial context from available properties
                if (window.openai.theme) setTheme(window.openai.theme);
                if (window.openai.displayMode) setDisplayMode(window.openai.displayMode);
                if (window.openai.locale) setLocale(window.openai.locale);
                if (window.openai.maxHeight) setMaxHeight(window.openai.maxHeight);
            } else {
                checkAttempts++;
                if (checkAttempts < maxAttempts) {
                    setTimeout(checkConnection, 100);
                } else {
                    // Timeout - not in ChatGPT environment
                    setError(new Error('ChatGPT SDK not available'));
                    setIsConnected(false);
                }
            }
        }

        checkConnection();

        return () => {
            mounted = false;
        };
    }, [appName]);

    // Call tool via ChatGPT's SDK
    const callTool = useCallback(
        async (name: string, args: Record<string, unknown> = {}): Promise<any> => {
            if (!window.openai?.callTool) {
                throw new Error('ChatGPT SDK not available');
            }

            // ChatGPT expects callTool(name, input)
            const result = await window.openai.callTool(name, args);
            return result;
        },
        []
    );

    const value: GptAppContextValue = {
        isConnected,
        error,
        theme,
        displayMode,
        locale,
        maxHeight,
        callTool,
    };

    return (
        <GptAppContext.Provider value={value}>
            <div className="lui-root" data-theme={theme}>
                {children}
            </div>
        </GptAppContext.Provider>
    );
}

/**
 * Hook to access the GPT App context
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isConnected, theme, callTool } = useGptApp();
 *   // ...
 * }
 * ```
 */
export function useGptApp(): GptAppContextValue {
    const context = useContext(GptAppContext);
    if (!context) {
        // Return fallback for non-ChatGPT environments
        return {
            isConnected: false,
            error: new Error('GPTAppProvider not found'),
            theme: 'light',
            displayMode: 'inline',
            locale: 'en',
            maxHeight: 600,
            callTool: async () => { throw new Error('Not connected to ChatGPT'); },
        };
    }
    return context;
}

/**
 * Hook to call tools via ChatGPT SDK
 * Similar to useTool but for GPT Apps
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { call, result, loading, error } = useGptTool('myTool');
 *   
 *   useEffect(() => {
 *     call({ param: 'value' });
 *   }, []);
 *   
 *   if (loading) return <div>Loading...</div>;
 *   return <div>{JSON.stringify(result)}</div>;
 * }
 * ```
 */
export function useGptTool(toolName: string) {
    const { callTool, isConnected } = useGptApp();
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const call = useCallback(
        async (args: Record<string, unknown> = {}) => {
            if (!isConnected) {
                setError(new Error('Not connected to ChatGPT'));
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const res = await callTool(toolName, args);
                setResult(res);
                return res;
            } catch (err: any) {
                setError(err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [callTool, isConnected, toolName]
    );

    return { call, result, loading, error, isConnected };
}
