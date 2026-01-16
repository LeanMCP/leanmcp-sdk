/**
 * ResponseEditor - AI-powered response drafting component
 */
import React, { useState, useEffect } from 'react';
import { useGptTool } from '@leanmcp/ui';
import { Mention, copyToClipboard, parseToolResult } from './shared';

interface ResponseEditorProps {
    mention: Mention;
}

export function ResponseEditor({ mention }: ResponseEditorProps) {
    const [response, setResponse] = useState('');
    const [tone, setTone] = useState<'professional' | 'friendly' | 'witty'>('friendly');
    const [copied, setCopied] = useState(false);

    const { call: generateResponse, loading: generating } = useGptTool('generateResponse');

    // Auto-generate on mount and when tone changes
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
    }, [mention, tone]);

    const handleCopy = async () => {
        const success = await copyToClipboard(response);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }

        // Open link using window.open (works in iframe sandbox)
        window.open(mention.url, '_blank');
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
