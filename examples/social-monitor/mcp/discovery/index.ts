/**
 * Discovery Service - Tab 1: MCP Discovery
 * 
 * Finds "MCP" mentions across HackerNews (and Reddit when available)
 * for organic LeanMCP introduction opportunities.
 */
import { Tool, SchemaConstraint, Optional } from '@leanmcp/core';
import { GPTApp } from '@leanmcp/ui/server';
import { hackerNewsService, type HNItem } from '../hackernews/index.js';
// REDDIT: Commented out until API access is approved
// import { redditService, type RedditComment, type RedditPost } from '../reddit/index.js';

// Unified mention format
export interface Mention {
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

class DiscoverInput {
    @Optional()
    @SchemaConstraint({
        description: 'Maximum number of results to return',
        default: 20,
        minimum: 1,
        maximum: 100
    })
    limit?: number;

    @Optional()
    @SchemaConstraint({
        description: 'Filter by platform',
        enum: ['all', 'hackernews'],  // REDDIT: removed 'reddit' option
        default: 'all'
    })
    platform?: 'all' | 'hackernews';
}

export class DiscoveryService {
    /**
     * Find MCP discussions for organic outreach
     * Searches for "MCP" mentions where LeanMCP could be naturally introduced
     */
    @Tool({
        description: 'Find MCP discussions on HackerNews for organic outreach opportunities. Returns posts and comments mentioning "MCP" where you could naturally introduce LeanMCP.',
        inputClass: DiscoverInput
    })
    @GPTApp({
        component: './DiscoveryView',
        title: 'MCP Discovery'
    })
    async discoverMCPOpportunities(input: DiscoverInput): Promise<{ mentions: Mention[]; total: number }> {
        const limit = input.limit ?? 20;
        const platform = input.platform ?? 'all';

        const mentions: Mention[] = [];

        // Search HackerNews
        if (platform === 'all' || platform === 'hackernews') {
            try {
                const hnResults = await hackerNewsService.searchByKeyword('model context protocol', {
                    tags: 'comment',
                    limit: limit
                });

                for (const item of hnResults.hits) {
                    // Skip if already mentions LeanMCP (already engaged)
                    const text = item.comment_text || item.text || '';
                    if (text.toLowerCase().includes('leanmcp')) continue;

                    mentions.push(this.hnItemToMention(item, 'discovery'));
                }
            } catch (error) {
                console.error('HN Discovery search error:', error);
            }
        }

        // REDDIT: Commented out until API access is approved
        // // Search Reddit
        // if ((platform === 'all' || platform === 'reddit') && redditService.isConfigured()) {
        //     try {
        //         const redditResults = await redditService.searchByKeyword('MCP', {
        //             type: 'comment',
        //             limit: Math.ceil(limit / 2),
        //             sort: 'new'
        //         });
        //
        //         for (const item of redditResults as RedditComment[]) {
        //             // Skip if already mentions LeanMCP
        //             if (item.body?.toLowerCase().includes('leanmcp')) continue;
        //
        //             mentions.push(this.redditCommentToMention(item, 'discovery'));
        //         }
        //     } catch (error) {
        //         console.error('Reddit Discovery search error:', error);
        //     }
        // }

        // Sort by date, newest first
        mentions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return {
            mentions: mentions.slice(0, limit),
            total: mentions.length
        };
    }

    /**
     * Convert HN item to unified Mention format
     */
    private hnItemToMention(item: HNItem, mode: Mention['mode']): Mention {
        return {
            id: `hn-${item.objectID}`,
            platform: 'hackernews',
            mode,
            type: item.type === 'story' ? 'post' : 'comment',
            content: item.comment_text || item.text || item.title || '',
            url: `https://news.ycombinator.com/item?id=${item.objectID}`,
            authorName: item.author,
            parentTitle: item.story_title || item.title,
            parentUrl: item.story_url || item.url,
            createdAt: item.created_at,
            status: 'pending',
            platformId: item.objectID
        };
    }

    // REDDIT: Commented out until API access is approved
    // /**
    //  * Convert Reddit comment to unified Mention format
    //  */
    // private redditCommentToMention(item: RedditComment, mode: Mention['mode']): Mention {
    //     return {
    //         id: `reddit-${item.id}`,
    //         platform: 'reddit',
    //         mode,
    //         type: 'comment',
    //         content: item.body,
    //         url: `https://reddit.com${item.permalink}`,
    //         authorName: item.author,
    //         parentTitle: item.link_title,
    //         createdAt: new Date(item.created_utc * 1000).toISOString(),
    //         status: 'pending',
    //         platformId: item.name // t1_xxxxx format for API
    //     };
    // }
}
