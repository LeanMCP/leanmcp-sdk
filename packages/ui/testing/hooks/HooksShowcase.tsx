/**
 * Hooks Showcase
 */
import React from 'react';
import { MockAppProvider } from '@leanmcp/ui/testing';
import { useToolResult, useTool, useHostContext, Card, CardHeader, CardContent, Button } from '@leanmcp/ui';

function ToolResultDemo() {
    const { result, hasResult } = useToolResult<{ city: string; temperature: number }>();
    return (
        <Card>
            <CardHeader title="useToolResult" description="Access tool results with type safety" />
            <CardContent>
                <pre style={{ background: 'var(--lui-surface)', color: 'var(--lui-text)', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
                    {JSON.stringify({ hasResult, result }, null, 2)}
                </pre>
            </CardContent>
        </Card>
    );
}

function ToolCallDemo() {
    const { call, loading, result } = useTool<{ weather: string }>('getWeather');
    return (
        <Card>
            <CardHeader title="useTool" description="Call MCP tools with loading states" />
            <CardContent>
                <Button onClick={() => call({ city: 'London' })} disabled={loading}>
                    {loading ? 'Loading...' : 'Call Tool'}
                </Button>
                {result && <pre style={{ marginTop: '12px', background: 'var(--lui-surface)', color: 'var(--lui-text)', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>{JSON.stringify(result, null, 2)}</pre>}
            </CardContent>
        </Card>
    );
}

function HostContextDemo() {
    const { theme, viewport } = useHostContext();
    return (
        <Card>
            <CardHeader title="useHostContext" description="Access host theme and viewport" />
            <CardContent>
                <pre style={{ background: 'var(--lui-surface)', color: 'var(--lui-text)', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
                    {JSON.stringify({ theme, viewport }, null, 2)}
                </pre>
            </CardContent>
        </Card>
    );
}

export function HooksShowcase({ theme }: { theme: 'light' | 'dark' }) {
    return (
        <MockAppProvider
            toolResult={{ city: 'London', temperature: 18 }}
            hostContext={{ theme, viewport: { width: 800, height: 600 } }}
            callTool={async () => ({ content: [{ type: 'text', text: '{"weather":"sunny"}' }] })}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <ToolResultDemo />
                <ToolCallDemo />
                <HostContextDemo />
            </div>
        </MockAppProvider>
    );
}
