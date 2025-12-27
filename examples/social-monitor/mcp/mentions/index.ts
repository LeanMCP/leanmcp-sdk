/**
 * Mentions Service - Tab 3: LeanMCP Mentions
 * 
 * Finds direct "LeanMCP" mentions on HackerNews (and Reddit when available)
 * for appreciation and support responses.
 */
import { Tool, SchemaConstraint, Optional } from '@leanmcp/core';
import { GPTApp } from '@leanmcp/ui/server';
import { hackerNewsService, type HNItem } from '../hackernews/index.js';
// REDDIT: Commented out until API access is approved
// import { redditService, type RedditComment } from '../reddit/index.js';
import type { Mention } from '../discovery/index.js';

class MentionsInput {
    @Optional()
    @SchemaConstraint({
        description: 'Filter by platform',
        enum: ['all', 'hackernews'],  // REDDIT: removed 'reddit' option
        default: 'all'
    })
    platform?: 'all' | 'hackernews';

    @Optional()
    @SchemaConstraint({
        description: 'Maximum number of mentions to return',
        default: 20,
        minimum: 1,
        maximum: 100
    })
    limit?: number;

    @Optional()
    @SchemaConstraint({
        description: 'Custom search term (default: LeanMCP)',
        default: 'LeanMCP'
    })
    searchTerm?: string;
}

export class MentionsService {
    /**
     * Find direct LeanMCP mentions
     * Searches for "LeanMCP" on HackerNews for appreciation responses
     */
    @Tool({
        description: 'Find direct mentions of "LeanMCP" on HackerNews. These are people already talking about your product - great for appreciation and support responses.',
        inputClass: MentionsInput
    })
    @GPTApp({
        component: './MentionsView',
        title: 'LeanMCP Mentions'
    })
    async getLeanMCPMentions(input: MentionsInput): Promise<{ mentions: Mention[]; total: number }> {
        const platform = input.platform ?? 'all';
        const limit = input.limit ?? 20;
        const searchTerm = input.searchTerm ?? 'LeanMCP';

        const mentions: Mention[] = [];

        // Search HackerNews
        if (platform === 'all' || platform === 'hackernews') {
            try {
                const hnResults = await hackerNewsService.searchByKeyword(searchTerm, {
                    tags: 'comment',
                    limit: limit
                });

                for (const item of hnResults.hits) {
                    mentions.push(this.hnItemToMention(item));
                }

                // Also search stories
                const hnStories = await hackerNewsService.searchByKeyword(searchTerm, {
                    tags: 'story',
                    limit: 10
                });

                for (const item of hnStories.hits) {
                    mentions.push(this.hnItemToMention(item));
                }
            } catch (error) {
                console.error('HN Mentions search error:', error);
            }
        }

        // REDDIT: Commented out until API access is approved
        // // Search Reddit
        // if ((platform === 'all' || platform === 'reddit') && redditService.isConfigured()) {
        //     try {
        //         const redditResults = await redditService.searchByKeyword(searchTerm, {
        //             type: 'comment',
        //             limit: Math.ceil(limit / 2),
        //             sort: 'new'
        //         });
        //
        //         for (const item of redditResults as RedditComment[]) {
        //             mentions.push(this.redditCommentToMention(item));
        //         }
        //     } catch (error) {
        //         console.error('Reddit Mentions search error:', error);
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
    private hnItemToMention(item: HNItem): Mention {
        return {
            id: `hn-${item.objectID}`,
            platform: 'hackernews',
            mode: 'mentions',
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
    // private redditCommentToMention(item: RedditComment): Mention {
    //     return {
    //         id: `reddit-${item.id}`,
    //         platform: 'reddit',
    //         mode: 'mentions',
    //         type: 'comment',
    //         content: item.body,
    //         url: `https://reddit.com${item.permalink}`,
    //         authorName: item.author,
    //         parentTitle: item.link_title,
    //         createdAt: new Date(item.created_utc * 1000).toISOString(),
    //         status: 'pending',
    //         platformId: item.name
    //     };
    // }
}
