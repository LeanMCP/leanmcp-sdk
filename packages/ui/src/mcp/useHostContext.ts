/**
 * useHostContext - Access host context (theme, viewport, locale, etc.)
 *
 * Returns the host context provided during initialization and updates.
 * The host sends this via ui/notifications/host-context-changed.
 */
import { useMcpApp } from './AppProvider';
import type { McpUiHostContext, McpUiHostStyles } from '@modelcontextprotocol/ext-apps';

export interface UseHostContextReturn {
  /** Current theme: 'light' or 'dark' */
  theme: 'light' | 'dark';
  /** Display mode: 'inline', 'fullscreen', 'pip' */
  displayMode: 'inline' | 'fullscreen' | 'pip';
  /** Available display modes supported by the host */
  availableDisplayModes: string[];
  /** Viewport dimensions */
  viewport: { width: number; height: number; maxWidth?: number; maxHeight?: number } | null;
  /** User locale (e.g., 'en-US') */
  locale: string | null;
  /** User timezone (e.g., 'America/New_York') */
  timeZone: string | null;
  /** Platform type */
  platform: 'web' | 'desktop' | 'mobile' | null;
  /** Host application identifier */
  userAgent: string | null;
  /** Device input capabilities */
  deviceCapabilities: { touch?: boolean; hover?: boolean } | null;
  /** Mobile safe area insets */
  safeAreaInsets: { top: number; right: number; bottom: number; left: number } | null;
  /** Host-provided style configuration */
  styles: McpUiHostStyles | null;
  /** Full raw context */
  rawContext: McpUiHostContext;
}

/**
 * Hook to access host context
 *
 * FIX #8: Now exposes all fields from McpUiHostContext including:
 * - styles (CSS variables and fonts)
 * - availableDisplayModes
 * - userAgent
 * - deviceCapabilities
 * - safeAreaInsets
 *
 * @example
 * ```tsx
 * function ThemedCard() {
 *   const { theme, locale, deviceCapabilities, styles } = useHostContext();
 *
 *   return (
 *     <div className={theme === 'dark' ? 'dark-mode' : 'light-mode'}>
 *       <p>Locale: {locale}</p>
 *       <p>Touch: {deviceCapabilities?.touch ? 'Yes' : 'No'}</p>
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
    availableDisplayModes: hostContext.availableDisplayModes ?? [],
    viewport: hostContext.viewport ?? null,
    locale: hostContext.locale ?? null,
    timeZone: hostContext.timeZone ?? null,
    platform: (hostContext.platform as 'web' | 'desktop' | 'mobile') ?? null,
    userAgent: hostContext.userAgent ?? null,
    deviceCapabilities: hostContext.deviceCapabilities ?? null,
    safeAreaInsets: hostContext.safeAreaInsets ?? null,
    styles: hostContext.styles ?? null,
    rawContext: hostContext,
  };
}
