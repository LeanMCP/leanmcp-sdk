/**
 * Social Monitor Dashboard - Main UI Component
 * 
 * Three-tab dashboard for monitoring and responding to social mentions:
 * - Tab 1: MCP Discovery - Find MCP discussions for organic outreach
 * - Tab 2: My Posts - Track replies on your own posts
 * - Tab 3: LeanMCP Mentions - Find direct product mentions
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useGptApp, useGptTool, useWidgetState, useToolOutput } from '@leanmcp/ui';

// Types
interface Mention {
    id: string;
    platform: 'reddit' | 'hackernews';
    mode: 'discovery' | 'my-posts' | 'mentions';
    type: 'post' | 'comment';
    content: string;
    url: string;
    authorName: string;
    parentTitle?: string;
    parentUrl?: string;
    createdAt: string;
    status: 'pending' | 'responded' | 'skipped';
    platformId: string;
}

type TabMode = 'discovery' | 'my-posts' | 'mentions';

// Tab configuration
const TABS: { mode: TabMode; label: string }[] = [
    { mode: 'discovery', label: 'MCP Discovery' },
    { mode: 'my-posts', label: 'My Posts' },
    { mode: 'mentions', label: 'LeanMCP Mentions' }
];

const TAB_TOOLS: Record<TabMode, string> = {
    'discovery': 'discoverMCPOpportunities',
    'my-posts': 'getMyPostReplies',
    'mentions': 'getLeanMCPMentions'
};

export function SocialMonitorDashboard() {
    const { isConnected } = useGptApp();

    if (!isConnected) {
        return <LoadingScreen />;
    }

    return <DashboardContent />;
}

function LoadingScreen() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 text-sm font-medium">Connecting...</p>
            </div>
        </div>
    );
}

interface DashboardState {
    activeTab: TabMode;
    [key: string]: unknown;
}

function DashboardContent() {
    const toolOutput = useToolOutput<any>();

    // Prefer toolOutput.initialTab, then fallback to 'discovery'
    const initialMode = (toolOutput?.initialTab as TabMode);
    const validInitialTab = ['discovery', 'my-posts', 'mentions'].includes(initialMode) ? initialMode : undefined;

    const [widgetState, setWidgetState] = useWidgetState<DashboardState>({ activeTab: validInitialTab || 'discovery' });
    const { activeTab } = widgetState;
    const setActiveTab = (mode: TabMode) => setWidgetState((prev: DashboardState) => ({ ...prev, activeTab: mode }));

    const [mentions, setMentions] = useState<Mention[]>([]);
    const [respondingToId, setRespondingToId] = useState<string | null>(null);

    // Sync state when toolOutput arrives (handling latency)
    useEffect(() => {
        if (validInitialTab && validInitialTab !== activeTab) {
            setMentions([]); // Clear stale data from previous tab
            setActiveTab(validInitialTab);
        }
    }, [validInitialTab]); // Only run if the *intent* from toolOutput changes/arrives

    const { call: fetchMentions, loading, error } = useGptTool(TAB_TOOLS[activeTab]);

    const loadMentions = useCallback(() => {
        fetchMentions({}).then((result) => {
            const data = parseToolResult(result);
            if (data?.mentions) {
                setMentions(data.mentions);
            }
        });
    }, [fetchMentions]);

    useEffect(() => {
        setMentions([]);  // Clear old data immediately
        setRespondingToId(null);
        loadMentions();
    }, [activeTab, loadMentions]);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
                    <h1 className="font-semibold text-gray-900">Social Monitor</h1>
                    <button
                        onClick={loadMentions}
                        disabled={loading}
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="max-w-3xl mx-auto px-4 flex gap-6">
                    {TABS.map((tab) => (
                        <button
                            key={tab.mode}
                            onClick={() => setActiveTab(tab.mode)}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.mode
                                ? 'border-gray-900 text-gray-900'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto px-4 py-6">
                {/* Stats */}
                <div className="mb-6 flex items-center gap-4 text-xs text-gray-500 font-medium">
                    <span>{mentions.length} results</span>
                    <span>•</span>
                    <span>HN: {mentions.filter(m => m.platform === 'hackernews').length}</span>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-md mb-6 text-sm border border-red-100">
                        {error.message}
                    </div>
                )}

                {loading && mentions.length === 0 ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                                <div className="h-4 bg-gray-100 rounded w-1/4 mb-3" />
                                <div className="h-3 bg-gray-50 rounded w-3/4 mb-2" />
                                <div className="h-3 bg-gray-50 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : mentions.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-400 mb-4">No results found</p>
                        <button onClick={loadMentions} className="text-blue-600 text-sm font-medium hover:underline">
                            Refresh
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {mentions.map((mention) => (
                            <MentionCard
                                key={mention.id}
                                mention={mention}
                                isResponding={respondingToId === mention.id}
                                onToggleRespond={() => setRespondingToId(
                                    respondingToId === mention.id ? null : mention.id
                                )}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

function MentionCard({ mention, isResponding, onToggleRespond }: {
    mention: Mention;
    isResponding: boolean;
    onToggleRespond: () => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const cleanContent = decodeHtmlEntities(mention.content);
    const isLongContent = cleanContent.length > 300;

    return (
        <div className={`bg-white border rounded-lg transition-shadow ${isResponding ? 'border-blue-500 shadow-sm ring-1 ring-blue-500/10' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="p-4">
                {/* Meta Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={`px-1.5 py-0.5 rounded font-medium ${mention.platform === 'hackernews' ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                            {mention.platform === 'hackernews' ? 'HN' : 'Reddit'}
                        </span>
                        <span className="font-medium text-gray-900">@{mention.authorName}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(mention.createdAt)}</span>
                    </div>
                    <button
                        onClick={() => window.open(mention.url, '_blank')}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="View original post"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </button>
                </div>

                {/* Context / Parent Title */}
                {mention.parentTitle && (
                    <div className="mb-3 text-xs text-gray-500 flex items-center gap-1.5 bg-gray-50 p-2 rounded">
                        <span className="shrink-0 text-gray-400">In:</span>
                        <span className="truncate font-medium text-gray-700">{decodeHtmlEntities(mention.parentTitle)}</span>
                    </div>
                )}

                {/* Content Body */}
                <div className={`text-sm text-gray-800 leading-relaxed space-y-2 mb-3 ${!isExpanded && isLongContent ? 'line-clamp-3' : ''}`}>
                    {cleanContent.split(/<p>|\n\n/).map((paragraph, i) => (
                        <p key={i}>{paragraph.replace(/<\/p>/g, '').trim()}</p>
                    ))}
                </div>

                {isLongContent && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-1"
                    >
                        {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                )}

                {/* Footer Actions */}
                <div className="flex items-center gap-3 pt-2">
                    <button
                        onClick={onToggleRespond}
                        className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${isResponding
                            ? 'bg-gray-100 text-gray-900'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        {isResponding ? (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                Cancel
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                Reply
                            </>
                        )}
                    </button>
                    {!isResponding && (
                        <button className="text-sm px-3 py-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                            Skip
                        </button>
                    )}
                </div>

                {/* Inline Response Editor */}
                {isResponding && (
                    <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                        <ResponseEditor mention={mention} />
                    </div>
                )}
            </div>
        </div>
    );
}

function ResponseEditor({ mention }: { mention: Mention }) {
    const [response, setResponse] = useState('');
    const [tone, setTone] = useState<'professional' | 'friendly' | 'witty'>('friendly');
    const [copied, setCopied] = useState(false);

    // Auto-generate on mount
    const { call: generateResponse, loading: generating } = useGptTool('generateResponse');

    useEffect(() => {
        generateResponse({
            mentionText: mention.content,
            mode: mention.mode,
            platform: mention.platform,
            tone
        }).then((result) => {
            const data = parseToolResult(result);
            if (data?.response) setResponse(data.response);
        });
    }, [mention, tone]); // Re-run if tone changes

    const handleCopy = async () => {
        const success = await copyToClipboard(response);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }

        // Open link in parent window (bypass iframe sandbox)
        if (window.top) {
            window.top.location.href = mention.url;
        } else {
            window.location.href = mention.url;
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Draft</span>
                    {generating && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                </div>

                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                    {(['professional', 'friendly', 'witty'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTone(t)}
                            disabled={generating}
                            className={`px-2 py-0.5 text-xs font-medium rounded-md capitalize transition-all ${tone === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="w-full h-32 p-3 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                placeholder="Drafting response..."
            />

            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                    {response.length} chars
                </span>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => generateResponse({
                            mentionText: mention.content,
                            mode: mention.mode,
                            platform: mention.platform,
                            tone
                        }).then((r: any) => {
                            const d = parseToolResult(r);
                            if (d?.response) setResponse(d.response);
                        })}
                        disabled={generating}
                        className="text-xs font-medium text-gray-500 hover:text-gray-900 px-3 py-1.5"
                    >
                        Regenerate
                    </button>

                    <button
                        onClick={handleCopy}
                        disabled={!response}
                        className="text-sm font-medium bg-gray-900 text-white px-4 py-1.5 rounded-md hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                    >
                        {copied ? (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Copied
                            </>
                        ) : (
                            <>
                                Copy & Open
                                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Utilities
function decodeHtmlEntities(text: string): string {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return doc.body.textContent || text;
}

function parseToolResult(result: any): any {
    if (!result) return null;
    if (result.result && typeof result.result === 'string') {
        try { return JSON.parse(result.result); } catch { /* fall through */ }
    }
    if (result.content?.[0]?.text) {
        try { return JSON.parse(result.content[0].text); } catch { /* fall through */ }
    }
    if (result.mentions || result.response) return result;
    return null;
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return date.toLocaleDateString();
}

/**
 * Robust copy to clipboard function
 * Tries Clipboard API first, falls back to legacy execCommand
 */
async function copyToClipboard(text: string): Promise<boolean> {
    // Strategy 1: Modern Clipboard API
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.warn('Clipboard API failed, trying fallback...', err);
    }

    // Strategy 2: Legacy execCommand
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // Ensure it's not visible but part of DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
    } catch (err) {
        console.error('Copy failed completely', err);
        return false;
    }
}

export default SocialMonitorDashboard;
