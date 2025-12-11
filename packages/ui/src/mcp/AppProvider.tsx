/**
 * AppProvider - MCP Apps context provider
 * 
 * Uses @modelcontextprotocol/ext-apps for communication with the host.
 * This is the root provider for all MCP App components.
 */
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from 'react';
import { App, PostMessageTransport } from '@modelcontextprotocol/ext-apps';
import type {
    McpUiHostContext,
    McpUiToolResultNotification,
    McpUiToolInputNotification,
    McpUiToolInputPartialNotification,
    McpUiAppCapabilities,
} from '@modelcontextprotocol/ext-apps';
import type { CallToolResult, Implementation } from '@modelcontextprotocol/sdk/types.js';

/**
 * App information (same as ext-apps Implementation)
 */
export interface AppInfo {
    name: string;
    version: string;
}

/**
 * Options for App behavior
 */
export interface AppOptions {
    /**
     * Automatically report size changes to the host using ResizeObserver.
     * @default true
     */
    autoResize?: boolean;
}

/**
 * MCP App context value - available via useMcpApp()
 */
export interface McpAppContextValue {
    /** The ext-apps App instance */
    app: App | null;
    /** Whether connected to host */
    isConnected: boolean;
    /** Connection error, if any */
    error: Error | null;
    /** Host context (theme, viewport, etc.) */
    hostContext: McpUiHostContext;
    /** Tool input arguments received from host */
    toolInput: Record<string, unknown> | null;
    /** Partial tool input (streaming) */
    toolInputPartial: Record<string, unknown> | null;
    /** Tool result received from host */
    toolResult: CallToolResult | null;
    /** Call a server tool */
    callTool: (name: string, args?: Record<string, unknown>) => Promise<CallToolResult>;
    /** Send a message to the host chat */
    sendMessage: (text: string) => Promise<void>;
    /** Send a log message */
    sendLog: (level: 'debug' | 'info' | 'warning' | 'error', data: unknown) => Promise<void>;
    /** Open a link in the host */
    openLink: (url: string) => Promise<void>;
}

const McpAppContext = createContext<McpAppContextValue | null>(null);

export interface AppProviderProps {
    /** App name and version */
    appInfo: AppInfo;
    /** App capabilities (tools, experimental features) */
    capabilities?: McpUiAppCapabilities;
    /** App options (autoResize, etc.) */
    options?: AppOptions;
    /** React children */
    children: ReactNode;
}

/**
 * AppProvider - Root context for MCP Apps
 * 
 * Provides connection management and hooks for MCP App components.
 * Uses PostMessage transport for iframe communication.
 * 
 * @example
 * ```tsx
 * function MyApp() {
 *   return (
 *     <AppProvider 
 *       appInfo={{ name: "MyApp", version: "1.0.0" }}
 *       capabilities={{ tools: { listChanged: true } }}
 *       options={{ autoResize: true }}
 *     >
 *       <MyContent />
 *     </AppProvider>
 *   );
 * }
 * ```
 */
export function AppProvider({ appInfo, capabilities = {}, options = { autoResize: true }, children }: AppProviderProps) {
    const [app, setApp] = useState<App | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [hostContext, setHostContext] = useState<McpUiHostContext>({});
    const [toolInput, setToolInput] = useState<Record<string, unknown> | null>(null);
    const [toolInputPartial, setToolInputPartial] = useState<Record<string, unknown> | null>(null);
    const [toolResult, setToolResult] = useState<CallToolResult | null>(null);

    // Connect to host on mount
    useEffect(() => {
        let mounted = true;
        let appInstance: App | null = null;

        async function connect() {
            try {
                const transport = new PostMessageTransport(window.parent);

                // Create App with all parameters
                appInstance = new App(
                    appInfo as Implementation,
                    capabilities,
                    options
                );

                // Register handlers BEFORE connecting
                appInstance.ontoolinput = (params: McpUiToolInputNotification['params']) => {
                    if (mounted) {
                        setToolInput(params.arguments as Record<string, unknown>);
                    }
                };

                // Handle partial/streaming tool input
                appInstance.ontoolinputpartial = (params: McpUiToolInputPartialNotification['params']) => {
                    if (mounted) {
                        setToolInputPartial(params.arguments as Record<string, unknown>);
                    }
                };

                appInstance.ontoolresult = (params: McpUiToolResultNotification['params']) => {
                    if (mounted) {
                        setToolResult(params as CallToolResult);
                    }
                };

                appInstance.onhostcontextchanged = (params: Partial<McpUiHostContext>) => {
                    if (mounted) {
                        setHostContext(prev => ({ ...prev, ...params }));
                    }
                };

                await appInstance.connect(transport);

                if (mounted) {
                    setApp(appInstance);
                    setIsConnected(true);
                    setError(null);

                    // Get host context from initialization (if available via capabilities)
                    // Note: ext-apps stores hostInfo and hostCapabilities but not hostContext
                    // hostContext comes via onhostcontextchanged notifications
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    setIsConnected(false);
                }
            }
        }

        connect();

        return () => {
            mounted = false;
            if (appInstance) {
                appInstance.close();
            }
        };
    }, [appInfo.name, appInfo.version]);

    // Context methods
    const callTool = useCallback(
        async (name: string, args: Record<string, unknown> = {}): Promise<CallToolResult> => {
            if (!app) {
                throw new Error('Not connected to host');
            }
            const result = await app.callServerTool({ name, arguments: args });
            // Also update toolResult so useToolResult() sees the new data
            setToolResult(result);
            return result;
        },
        [app]
    );

    const sendMessage = useCallback(
        async (text: string) => {
            if (!app) {
                console.warn('[AppProvider] Not connected - cannot send message');
                return;
            }
            await app.sendMessage({
                role: 'user',
                content: [{ type: 'text', text }],
            });
        },
        [app]
    );

    const sendLog = useCallback(
        async (level: 'debug' | 'info' | 'warning' | 'error', data: unknown) => {
            if (!app) {
                console.log(`[MCP App] ${level}:`, data);
                return;
            }
            await app.sendLog({ level, data });
        },
        [app]
    );

    const openLink = useCallback(
        async (url: string) => {
            if (!app) {
                // Fallback: open in new tab
                window.open(url, '_blank', 'noopener,noreferrer');
                return;
            }
            await app.sendOpenLink({ url });
        },
        [app]
    );

    const value: McpAppContextValue = {
        app,
        isConnected,
        error,
        hostContext,
        toolInput,
        toolInputPartial,
        toolResult,
        callTool,
        sendMessage,
        sendLog,
        openLink,
    };

    // Theme is applied via CSS custom properties, not imperative DOM manipulation
    // Users can use hostContext.theme to style their components
    const theme = hostContext.theme ?? 'light';

    return (
        <McpAppContext.Provider value={value}>
            <div className="lui-root" data-theme={theme}>
                {children}
            </div>
        </McpAppContext.Provider>
    );
}

/**
 * Default context for SSR (no AppProvider available)
 */
const ssrDefaultContext: McpAppContextValue = {
    app: null,
    isConnected: false,
    error: null,
    hostContext: {},
    toolInput: null,
    toolInputPartial: null,
    toolResult: null,
    callTool: async () => { throw new Error('callTool not available during SSR'); },
    sendMessage: async () => { console.warn('sendMessage not available during SSR'); },
    sendLog: async () => { console.warn('sendLog not available during SSR'); },
    openLink: async () => { console.warn('openLink not available during SSR'); },
};

/**
 * Hook to access the MCP App context
 * Returns SSR-safe defaults when no provider is available (during server rendering)
 */
export function useMcpApp(): McpAppContextValue {
    const context = useContext(McpAppContext);
    // Return SSR defaults if no context (during server-side rendering)
    if (!context) {
        return ssrDefaultContext;
    }
    return context;
}
