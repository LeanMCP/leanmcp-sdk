/**
 * useHostContext - Access host context (theme, viewport, locale, etc.)
 * 
 * Returns the host context provided during initialization and updates.
 * The host sends this via ui/notifications/host-context-changed.
 */
import { useMcpApp } from './AppProvider';
import type { McpUiHostContext } from '@modelcontextprotocol/ext-apps';

export interface UseHostContextReturn {
    /** Current theme: 'light' or 'dark' */
    theme: 'light' | 'dark';
    /** Display mode: 'inline', 'fullscreen', 'pip' */
    displayMode: 'inline' | 'fullscreen' | 'pip';
    /** Viewport dimensions */
    viewport: { width: number; height: number } | null;
    /** User locale (e.g., 'en-US') */
    locale: string | null;
    /** User timezone (e.g., 'America/New_York') */
    timeZone: string | null;
    /** Platform type */
    platform: 'web' | 'desktop' | 'mobile' | null;
    /** Full raw context */
    rawContext: McpUiHostContext;
}

/**
 * Hook to access host context
 * 
 * @example
 * ```tsx
 * function ThemedCard() {
 *   const { theme, locale } = useHostContext();
 *   
 *   return (
 *     <div className={theme === 'dark' ? 'dark-mode' : 'light-mode'}>
 *       Locale: {locale}
 *     </div>
 *   );
 * }
 * ```
 */
export function useHostContext(): UseHostContextReturn {
    const { hostContext } = useMcpApp();

    return {
        theme: (hostContext.theme as 'light' | 'dark') ?? 'light',
        displayMode: (hostContext.displayMode as 'inline' | 'fullscreen' | 'pip') ?? 'inline',
        viewport: hostContext.viewport ?? null,
        locale: hostContext.locale ?? null,
        timeZone: hostContext.timeZone ?? null,
        platform: (hostContext.platform as 'web' | 'desktop' | 'mobile') ?? null,
        rawContext: hostContext,
    };
}
