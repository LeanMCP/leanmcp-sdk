import React, { useEffect, useRef, type ReactNode, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { useMcpApp } from '../mcp/AppProvider';
import './AppShell.css';

export interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  /** Header content */
  header?: ReactNode;
  /** Sidebar content */
  sidebar?: ReactNode;
  /** Footer content */
  footer?: ReactNode;
  /** Sidebar position */
  sidebarPosition?: 'left' | 'right';
  /** Sidebar width */
  sidebarWidth?: number | string;
  /** Enable auto-resize to content (uses ext-apps sendSizeChanged) */
  autoResize?: boolean;
  /** Padding */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * AppShell - Root layout container for MCP Apps
 *
 * Provides header, sidebar, main content, and footer areas with auto-resize support.
 * Uses the ext-apps protocol for proper size change notifications.
 *
 * @example
 * ```tsx
 * <AppShell
 *   header={<h1>My App</h1>}
 *   sidebar={<Navigation />}
 *   autoResize
 * >
 *   <MainContent />
 * </AppShell>
 * ```
 */
export function AppShell({
  header,
  sidebar,
  footer,
  sidebarPosition = 'left',
  sidebarWidth = 240,
  autoResize = true,
  padding = 'md',
  className,
  children,
  ...props
}: AppShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { app } = useMcpApp();

  // Auto-resize effect - FIX #1: Use proper ext-apps sendSizeChanged
  useEffect(() => {
    // Skip if autoResize is disabled or no container
    if (!autoResize || !containerRef.current) return;

    // Skip if app not connected - the App's built-in autoResize handles this
    // This effect is for cases where we want additional resize triggers
    if (!app) return;

    let lastWidth = 0;
    let lastHeight = 0;
    let scheduled = false;

    const sendSizeChanged = () => {
      if (scheduled) return;
      scheduled = true;

      requestAnimationFrame(() => {
        scheduled = false;
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.ceil(rect.width);
        const height = Math.ceil(rect.height);

        // Only send if size actually changed
        if (width !== lastWidth || height !== lastHeight) {
          lastWidth = width;
          lastHeight = height;
          // Use the proper ext-apps protocol method
          app.sendSizeChanged({ width, height });
        }
      });
    };

    const resizeObserver = new ResizeObserver(sendSizeChanged);
    resizeObserver.observe(containerRef.current);

    // Initial send
    sendSizeChanged();

    return () => {
      resizeObserver.disconnect();
    };
  }, [autoResize, app]);

  const sidebarStyle = {
    width: typeof sidebarWidth === 'number' ? `${sidebarWidth}px` : sidebarWidth,
    flexShrink: 0,
  };

  return (
    <div
      ref={containerRef}
      className={clsx('lui-app-shell', `lui-app-shell--padding-${padding}`, className)}
      {...props}
    >
      {header && <header className="lui-app-shell-header">{header}</header>}

      <div className="lui-app-shell-body">
        {sidebar && sidebarPosition === 'left' && (
          <aside className="lui-app-shell-sidebar" style={sidebarStyle}>
            {sidebar}
          </aside>
        )}

        <main className="lui-app-shell-main">{children}</main>

        {sidebar && sidebarPosition === 'right' && (
          <aside className="lui-app-shell-sidebar" style={sidebarStyle}>
            {sidebar}
          </aside>
        )}
      </div>

      {footer && <footer className="lui-app-shell-footer">{footer}</footer>}
    </div>
  );
}
