/**
 * MentionCard - Reusable component for displaying a social media mention
 */
import React, { useState } from 'react';
import { Mention, decodeHtmlEntities, formatTimeAgo } from './shared';
import { ResponseEditor } from './ResponseEditor';

interface MentionCardProps {
    mention: Mention;
    isResponding: boolean;
    onToggleRespond: () => void;
}

export function MentionCard({ mention, isResponding, onToggleRespond }: MentionCardProps) {
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
