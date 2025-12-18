/**
 * MCP Components Showcase
 * 
 * AVANT-GARDE EDITION
 */
import React, { useState } from 'react';
import { MockAppProvider } from '../../src/testing';
import { ToolButton } from '../../src/mcp/ToolButton';
import { ToolSelect } from '../../src/mcp/ToolSelect';
import { ToolInput } from '../../src/mcp/ToolInput';
import { ToolForm } from '../../src/mcp/ToolForm';
import { ToolDataGrid } from '../../src/mcp/ToolDataGrid';
import { ToolProvider } from '../../src/mcp/ToolProvider';
import { ArrowRight, Terminal } from 'lucide-react';

// --- Avant-Garde Presentation Component ---

const RunwaySection = ({
    title,
    subtitle,
    children,
    align = 'center',
    id
}: {
    title: string;
    subtitle: string;
    children: React.ReactNode;
    align?: 'left' | 'center' | 'right';
    id?: string;
}) => (
    <section id={id} className="group relative mb-48 last:mb-0 w-full scroll-mt-32">
        {/* Hover Spotlight Effect */}
        <div className="absolute -inset-20 bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-rose-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-[50px] blur-3xl pointer-events-none" />

        <div className={`flex flex-col ${align === 'center' ? 'items-center text-center' : align === 'left' ? 'items-start text-left' : 'items-end text-right'} relative z-10`}>

            {/* Typography */}
            <div className="mb-16 max-w-3xl">
                <div className="flex items-center gap-4 mb-6 opacity-60">
                    <div className="h-[1px] w-12 bg-white" />
                    <span className="text-xs font-mono uppercase tracking-[0.3em] text-white">Component Series</span>
                    <div className="h-[1px] w-12 bg-white" />
                </div>
                <h2 className="text-5xl md:text-6xl font-extralight tracking-tight mb-6 text-white leading-tight">
                    {title}
                </h2>
                <div className={`h-[1px] w-24 bg-gradient-to-r from-violet-500 to-rose-500 mb-8 ${align === 'center' ? 'mx-auto' : align === 'right' ? 'ml-auto' : ''} group-hover:w-full transition-all duration-1000 ease-out`} />
                <p className={`text-xl text-zinc-400 font-light leading-relaxed max-w-2xl ${align === 'right' ? 'ml-auto' : ''}`}>
                    {subtitle}
                </p>
            </div>

            {/* Component Stage */}
            <div className="
                w-full md:max-w-5xl 
                p-10 md:p-16
                rounded-[2rem]
                bg-[#0f0f12]/80 backdrop-blur-md 
                border border-white/5 
                shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)]
                hover:border-white/10 hover:shadow-[0_0_80px_-20px_rgba(139,92,246,0.1)]
                transition-all duration-700
            ">
                {children}
            </div>
        </div>
    </section>
);

const ConsoleOutput = ({ output }: { output: string | null }) => (
    <div className={`
        mt-12 w-full max-w-lg mx-auto overflow-hidden rounded-xl border border-white/5 bg-black/50 backdrop-blur transition-all duration-500
        ${output ? 'opacity-100 translate-y-0 h-auto' : 'opacity-0 translate-y-4 h-0'}
    `}>
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/5">
            <Terminal size={12} className="text-zinc-500" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">System Output</span>
        </div>
        <div className="p-4 font-mono text-xs text-green-400/90 break-all leading-relaxed">
            {output && `> ${output}`}
            <span className="animate-pulse inline-block w-1.5 h-3 bg-green-500/50 ml-1 align-middle" />
        </div>
    </div>
);

// ============================================================================
// Demos
// ============================================================================

function ToolButtonDemo() {
    const [lastResult, setLastResult] = useState<string | null>(null);

    return (
        <RunwaySection
            title="The Trigger"
            subtitle="Interaction distilled to its purest form. A button that not only clicks but thinks, connects, and responds. Handles loading loops, error boundaries, and haptic confirmations."
            id="buttons"
        >
            <div className="flex flex-col items-center gap-12">
                <div className="flex flex-wrap gap-8 items-center justify-center">
                    <ToolButton
                        tool="refresh-data"
                        onToolSuccess={(r) => setLastResult(JSON.stringify(r))}
                        className="rounded-full px-10 py-7 text-base font-medium tracking-wide shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all duration-500 bg-white text-black hover:bg-white hover:scale-105"
                    >
                        Execute Action
                    </ToolButton>

                    <ToolButton
                        tool="save-item"
                        args={{ id: 1 }}
                        resultDisplay="toast"
                        successMessage="Data successfully persisted to the void."
                        variant="secondary"
                        className="rounded-full px-8 py-6 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                    >
                        Success Notification
                    </ToolButton>

                    <ToolButton tool="action" variant="outline" className="rounded-full px-8 py-6 border-white/20 text-zinc-400 hover:text-white hover:border-white transition-colors duration-300">
                        Outline Variant
                    </ToolButton>
                </div>

                <div className="w-full max-w-md border-t border-white/5 pt-10 flex flex-col items-center gap-6">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-rose-500/80 font-bold border border-rose-500/20 px-3 py-1 rounded-full">Destructive Zone</span>
                    <ToolButton
                        tool="delete-item"
                        args={{ id: 1 }}
                        confirm={{
                            title: 'Irreversible Action Sequence',
                            description: 'You are about to permanently alter the state of this system. This action cannot be rewound.',
                            confirmText: 'Confirm Disintegration',
                            confirmVariant: 'destructive',
                        }}
                        variant="destructive"
                        className="w-full rounded-2xl bg-gradient-to-r from-rose-900/50 to-red-900/50 hover:from-rose-600 hover:to-red-600 border border-rose-500/20 transition-all duration-500"
                    >
                        Initiate Delete Sequence
                    </ToolButton>
                </div>

                <ConsoleOutput output={lastResult} />
            </div>
        </RunwaySection>
    );
}

function ToolSelectDemo() {
    return (
        <RunwaySection
            title="Selection Intelligence"
            subtitle="Dynamic choices powered by server-side logic. The dropdown evolved past static lists into a real-time decision engine."
            align="left"
            id="selection"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 w-full">
                <div className="space-y-6">
                    <div className="flex justify-between items-baseline">
                        <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Intelligent Sort</label>
                        <span className="text-[10px] text-violet-400 font-mono">MCP LINKED</span>
                    </div>
                    <ToolSelect
                        options={[
                            { value: 'asc', label: 'Ascending Order' },
                            { value: 'desc', label: 'Descending Order' },
                        ]}
                        onSelectTool="set-sort-order"
                        argName="order"
                        showSuccessToast
                        successMessage="Sort preference reconfigured."
                        placeholder="Select Logic..."
                        className="h-14 bg-white/5 border-white/10 text-white rounded-2xl px-4 hover:bg-white/10 transition-colors focus:ring-1 focus:ring-violet-500/50"
                    />
                    <p className="text-sm text-zinc-600 font-light">Selecting an option immediately triggers a corresponding tool call, updating server state without extra clicks.</p>
                </div>

                <div className="space-y-6">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Static Selection</label>
                    <ToolSelect
                        options={[
                            { value: 'v1', label: 'Quantum V1' },
                            { value: 'v2', label: 'Quantum V2' },
                        ]}
                        placeholder="Choose Reality..."
                        className="h-14 bg-white/5 border-white/10 text-white rounded-2xl px-4 hover:bg-white/10 transition-colors"
                    />
                    <p className="text-sm text-zinc-600 font-light">Standard selection mode for local state management or form inputs.</p>
                </div>
            </div>
        </RunwaySection>
    );
}

function ToolInputDemo() {
    return (
        <RunwaySection
            title="Input Velocity"
            subtitle="Type ahead of time. Debounced, predictive, and connected interactions that anticipate user intent before they finish typing."
            align="right"
            id="inputs"
        >
            <div className="flex flex-col gap-12 w-full max-w-xl ml-auto">
                <div className="space-y-6">
                    <div className="relative group/input">
                        {/* Glow effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 rounded-2xl opacity-0 group-hover/input:opacity-100 transition duration-700 blur-lg"></div>

                        <ToolInput
                            searchTool="search-items"
                            argName="query"
                            debounce={300}
                            minChars={2}
                            placeholder="Search the void..."
                            className="relative w-full h-16 bg-[#0a0a0a] border border-white/10 text-xl text-white placeholder:text-zinc-700 rounded-2xl px-6 focus:ring-0 focus:border-white/30 transition-all"
                        />
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500 font-mono">
                        <span>DEBOUNCE: 300MS</span>
                        <span>TOOL: search-items</span>
                    </div>
                </div>

                <div className="space-y-6 text-right">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Predictive User Lookup</label>
                    <ToolInput
                        searchTool="search-users"
                        autocomplete
                        transformSuggestions={(result: unknown) => {
                            const data = result as { users?: Array<{ id: string; name: string; email: string }> };
                            return (data.users ?? []).map(u => ({
                                value: u.id,
                                label: u.name,
                                description: u.email,
                            }));
                        }}
                        placeholder="Find entity..."
                        className="h-14 bg-white/5 border-white/10 text-white rounded-2xl px-4 text-right"
                    />
                    <p className="text-sm text-zinc-600 font-light">Auto-complete suggestions fetched dynamically from the MCP server as you type.</p>
                </div>
            </div>
        </RunwaySection>
    );
}

function FormAndDataDemo() {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 mb-40 w-full" id="data">
            <div className="p-10 rounded-[2.5rem] bg-[#0f0f12]/80 backdrop-blur-md border border-white/5 relative overflow-hidden group hover:border-violet-500/30 transition-colors duration-500">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500 transform scale-150 rotate-12 pointer-events-none">
                    <ArrowRight size={200} />
                </div>

                <div className="mb-8">
                    <h3 className="text-3xl font-light text-white mb-2">Structural Form</h3>
                    <p className="text-zinc-500">Auto-generated schemas that validate and submit directly to tools.</p>
                </div>

                <ToolForm
                    toolName="create-item"
                    fields={[
                        { name: 'project', label: 'Structure Name', type: 'text', placeholder: 'Project Alpha' },
                        { name: 'type', label: 'Classification', type: 'select', options: [{ value: 'a', label: 'Type A' }, { value: 'b', label: 'Type B' }] },
                        { name: 'desc', label: 'Metadata', type: 'textarea', placeholder: 'Additional parameters...' }
                    ]}
                    submitText="Deploy Structure"
                    showSuccessToast
                    successMessage="Structure deployed to network."
                />
            </div>

            <div className="p-10 rounded-[2.5rem] bg-[#0f0f12]/80 backdrop-blur-md border border-white/5 group hover:border-rose-500/30 transition-colors duration-500 flex flex-col">
                <div className="mb-8">
                    <h3 className="text-3xl font-light text-white mb-2">Tabular Matrix</h3>
                    <p className="text-zinc-500">High-density data visualization with server-side pagination.</p>
                </div>

                <div className="flex-1 rounded-xl overflow-hidden border border-white/5">
                    <ToolDataGrid
                        dataTool="list-users"
                        columns={[
                            { key: 'name', header: 'Entity Identity' },
                            {
                                key: 'status', header: 'Network State', render: (val) => (
                                    <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm ${val === 'Online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {String(val)}
                                    </span>
                                )
                            },
                        ]}
                        transformData={(result: unknown) => {
                            const data = result as { users: Array<Record<string, unknown>>; total: number };
                            return { rows: data.users, total: data.total };
                        }}
                        rowActions={[{ label: 'Mod', tool: 'edit', variant: 'ghost' }]}
                        pagination
                        pageSizes={[3]}
                        defaultPageSize={3}
                    />
                </div>
            </div>
        </div>
    );
}


// ============================================================================
// Main Showcase
// ============================================================================

export function McpShowcase({ theme }: { theme: 'light' | 'dark' }) {
    // Mock tool implementations
    const mockCallTool = async (toolName: string, args?: Record<string, unknown>) => {
        await new Promise(resolve => setTimeout(resolve, 800));
        switch (toolName) {
            case 'list-users':
                return {
                    content: [{
                        type: 'text' as const,
                        text: JSON.stringify({
                            users: [
                                { id: '1', name: 'Alice F.', email: 'alice@x.com', status: 'Online' },
                                { id: '2', name: 'Bob S.', email: 'bob@x.com', status: 'Offline' },
                                { id: '3', name: 'Charlie', email: 'c@x.com', status: 'Online' },
                            ],
                            total: 3,
                        }),
                    }],
                };
            case 'search-users':
                return {
                    content: [{
                        type: 'text' as const,
                        text: JSON.stringify({
                            users: [
                                { id: '1', name: 'Alice J.', email: 'alice@x.com' },
                                { id: '2', name: 'Alan S.', email: 'alan@x.com' },
                            ],
                        }),
                    }],
                };
            default:
                return {
                    content: [{
                        type: 'text' as const,
                        text: JSON.stringify({ success: true, toolName, args }),
                    }],
                };
        }
    };

    return (
        <MockAppProvider
            hostContext={{ theme, viewport: { width: 800, height: 600 } }}
            callTool={mockCallTool}
        >
            <ToolProvider defaults={{ showLoading: true }}>
                <div className="flex flex-col items-center w-full">
                    <ToolButtonDemo />
                    <ToolSelectDemo />
                    <ToolInputDemo />
                    <FormAndDataDemo />

                    <div className="h-40 w-[1px] bg-gradient-to-b from-zinc-800 to-transparent" />
                </div>
            </ToolProvider>
        </MockAppProvider>
    );
}
