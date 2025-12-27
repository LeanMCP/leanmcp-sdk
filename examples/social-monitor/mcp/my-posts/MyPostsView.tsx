/**
 * MyPostsView - Focused view for My Posts tool
 * Shows only replies on user's posts without tabs
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useGptTool } from '@leanmcp/ui';
import { MentionCard } from '../components/MentionCard';
import { Mention, parseToolResult } from '../components/shared';

export function MyPostsView() {
    const [mentions, setMentions] = useState<Mention[]>([]);
    const [respondingToId, setRespondingToId] = useState<string | null>(null);

    const { call: fetchMentions, loading, error } = useGptTool('getMyPostReplies');

    const loadMentions = useCallback(() => {
        fetchMentions({}).then((result) => {
            const data = parseToolResult(result);
            if (data?.mentions) {
                setMentions(data.mentions);
            }
        });
    }, [fetchMentions]);

    useEffect(() => {
        loadMentions();
    }, [loadMentions]);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
                    <h1 className="font-semibold text-gray-900">My Posts</h1>
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
            </header>

            {/* Content */}
            <main className="max-w-3xl mx-auto px-4 py-6">
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
                        <p className="text-gray-400 mb-4">No replies found</p>
                        <button onClick={loadMentions} className="text-blue-600 text-sm font-medium hover:underline">
                            Refresh
                        </button>
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-gray-500 mb-6">
                            {mentions.length} {mentions.length === 1 ? 'reply' : 'replies'} on your posts
                        </p>

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
                    </>
                )}
            </main>
        </div>
    );
}

export default MyPostsView;
