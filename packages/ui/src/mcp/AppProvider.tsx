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
    useRef,
    type ReactNode,
} from 'react';
import {
    App,
    PostMessageTransport,
    applyHostStyleVariables,
    applyDocumentTheme,
} from '@modelcontextprotocol/ext-apps';
import type {
    McpUiHostContext,
    McpUiToolResultNotification,
    McpUiToolInputNotification,
    McpUiToolInputPartialNotification,
    McpUiToolCancelledNotification,
    McpUiAppCapabilities,
    McpUiDisplayMode,
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
    /** Whether the tool was cancelled by host */
    toolCancelled: { cancelled: boolean; reason?: string };
    /** Call a server tool */
    callTool: (name: string, args?: Record<string, unknown>) => Promise<CallToolResult>;
    /** Send a message to the host chat */
    sendMessage: (text: string) => Promise<void>;
    /** Send a log message */
    sendLog: (level: 'debug' | 'info' | 'warning' | 'error', data: unknown) => Promise<void>;
    /** Open a link in the host */
    openLink: (url: string) => Promise<void>;
    /** Request a display mode change */
    requestDisplayMode: (mode: McpUiDisplayMode) => Promise<McpUiDisplayMode>;
}

export const McpAppContext = createContext<McpAppContextValue | null>(null);

export interface AppProviderProps {
    /** App name and version */
    appInfo: AppInfo;
    /** App capabilities (tools, experimental features) */
    capabilities?: McpUiAppCapabilities;
    /** App options (autoResize, etc.) */
    options?: AppOptions;
    /** Callback when host requests teardown */
    onTeardown?: () => void | Promise<void>;
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
 *       onTeardown={() => console.log('Cleaning up...')}
 *     >
 *       <MyContent />
 *     </AppProvider>
 *   );
 * }
 * ```
 */
export function AppProvider({ appInfo, capabilities = {}, options = { autoResize: true }, onTeardown, children }: AppProviderProps) {
    const [app, setApp] = useState<App | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [hostContext, setHostContext] = useState<McpUiHostContext>({});
    const [toolInput, setToolInput] = useState<Record<string, unknown> | null>(null);
    const [toolInputPartial, setToolInputPartial] = useState<Record<string, unknown> | null>(null);
    const [toolResult, setToolResult] = useState<CallToolResult | null>(null);
    const [toolCancelled, setToolCancelled] = useState<{ cancelled: boolean; reason?: string }>({ cancelled: false });

    // Track initial styles applied to avoid duplicates
    const stylesApplied = useRef(false);

    // Helper to apply host styles
    const applyHostStyles = useCallback((context: McpUiHostContext) => {
        // Apply theme
        if (context.theme) {
            applyDocumentTheme(context.theme);
        }
        // Apply style variables
        if (context.styles?.variables) {
            applyHostStyleVariables(context.styles.variables);
        }
        // TODO: Apply fonts when applyHostFonts is available in ext-apps
        // if (context.styles?.css?.fonts) {
        //     applyHostFonts(context.styles.css.fonts);
        // }
    }, []);

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
                        // Reset cancelled state on new input
                        setToolCancelled({ cancelled: false });
                        // Note: Don't set isConnected here - it's set after connect() completes
                        // This handler is for when the host sends tool input (Tools tab context)
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

                // FIX #3: Handle tool cancellation
                appInstance.ontoolcancelled = (params: McpUiToolCancelledNotification['params']) => {
                    if (mounted) {
                        setToolCancelled({ cancelled: true, reason: params.reason });
                    }
                };

                appInstance.onhostcontextchanged = (params: Partial<McpUiHostContext>) => {
                    if (mounted) {
                        setHostContext(prev => ({ ...prev, ...params }));
                        // FIX #6 & #7: Apply host styles on context change
                        applyHostStyles(params as McpUiHostContext);
                    }
                };

                // FIX #9: Handle teardown requests
                if (onTeardown) {
                    appInstance.onteardown = async () => {
                        await onTeardown();
                        return {};
                    };
                }

                await appInstance.connect(transport);

                if (mounted) {
                    setApp(appInstance);
                    // Set connected after successful connection
                    // This allows RequireConnection to render children (ToolDataGrid)
                    // ToolDataGrid will handle its own loading state while fetching data
                    setIsConnected(true);
                    setError(null);

                    // FIX #2: Get initial host context from the App after connect
                    const initialContext = appInstance.getHostContext();
                    if (initialContext) {
                        setHostContext(initialContext);

                        // Apply initial styles once
                        if (!stylesApplied.current) {
                            applyHostStyles(initialContext);
                            stylesApplied.current = true;
                        }
                    }
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
    }, [appInfo.name, appInfo.version, applyHostStyles, onTeardown]);

    // Context methods
    const callTool = useCallback(
        async (name: string, args: Record<string, unknown> = {}): Promise<CallToolResult> => {
            if (!app) {
                throw new Error('Not connected to host');
            }
            // Reset cancelled state when calling a new tool
            setToolCancelled({ cancelled: false });
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

    // FIX #4: Use non-deprecated openLink method
    const openLink = useCallback(
        async (url: string) => {
            if (!app) {
                // Fallback: open in new tab
                window.open(url, '_blank', 'noopener,noreferrer');
                return;
            }
            await app.openLink({ url });
        },
        [app]
    );

    // FIX #5: Add requestDisplayMode
    const requestDisplayMode = useCallback(
        async (mode: McpUiDisplayMode): Promise<McpUiDisplayMode> => {
            if (!app) {
                console.warn('[AppProvider] Not connected - cannot request display mode');
                return 'inline';
            }
            const result = await app.requestDisplayMode({ mode });
            return result.mode;
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
        toolCancelled,
        callTool,
        sendMessage,
        sendLog,
        openLink,
        requestDisplayMode,
    };

    // Theme is applied via CSS custom properties
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
    toolCancelled: { cancelled: false },
    callTool: async () => { throw new Error('callTool not available during SSR'); },
    sendMessage: async () => { console.warn('sendMessage not available during SSR'); },
    sendLog: async () => { console.warn('sendLog not available during SSR'); },
    openLink: async () => { console.warn('openLink not available during SSR'); },
    requestDisplayMode: async () => { console.warn('requestDisplayMode not available during SSR'); return 'inline'; },
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
