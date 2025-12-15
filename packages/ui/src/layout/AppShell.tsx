import React, { useEffect, useRef, type ReactNode, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';
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
    /** Enable auto-resize to content */
    autoResize?: boolean;
    /** Padding */
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * AppShell - Root layout container for MCP Apps
 * 
 * Provides header, sidebar, main content, and footer areas with auto-resize support.
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

    // Auto-resize effect
    useEffect(() => {
        if (!autoResize || !containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { height } = entry.contentRect;
                // Send resize message to parent (host)
                window.parent.postMessage(
                    {
                        type: 'resize',
                        height: Math.ceil(height),
                    },
                    '*'
                );
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [autoResize]);

    const sidebarStyle = {
        width: typeof sidebarWidth === 'number' ? `${sidebarWidth}px` : sidebarWidth,
        flexShrink: 0,
    };

    return (
        <div
            ref={containerRef}
            className={clsx(
                'lui-app-shell',
                `lui-app-shell--padding-${padding}`,
                className
            )}
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
