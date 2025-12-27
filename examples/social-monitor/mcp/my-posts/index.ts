/**
 * My Posts Service - Tab 2: My Posts
 * 
 * Fetches replies on the user's own posts on HackerNews (and Reddit when available)
 * for engagement and community building.
 */
import { Tool, SchemaConstraint, Optional } from '@leanmcp/core';
import { GPTApp } from '@leanmcp/ui/server';
import { hackerNewsService, type HNItem } from '../hackernews/index.js';
// REDDIT: Commented out until API access is approved
// import { redditService, type RedditComment } from '../reddit/index.js';
import type { Mention } from '../discovery/index.js';

class MyPostsInput {
    @Optional()
    @SchemaConstraint({
        description: 'Filter by platform',
        enum: ['all', 'hackernews'],  // REDDIT: removed 'reddit' option
        default: 'all'
    })
    platform?: 'all' | 'hackernews';

    @Optional()
    @SchemaConstraint({
        description: 'Maximum number of replies to return',
        default: 30,
        minimum: 1,
        maximum: 100
    })
    limit?: number;
}

export class MyPostsService {
    /**
     * Get replies on your HackerNews posts
     * Fetches comments from other users on your submitted content
     */
    @Tool({
        description: 'Get replies and comments on YOUR posts on HackerNews. Shows engagement from the community that you can respond to.',
        inputClass: MyPostsInput
    })
    @GPTApp({
        component: './MyPostsView',
        title: 'My Posts'
    })
    async getMyPostReplies(input: MyPostsInput): Promise<{
        mentions: Mention[];
        total: number;
        hnUsername?: string;
        // REDDIT: redditUsername?: string;
    }> {
        const platform = input.platform ?? 'all';
        const limit = input.limit ?? 30;

        const mentions: Mention[] = [];

        const hnUsername = process.env.HN_USERNAME;
        // REDDIT: const redditUsername = process.env.REDDIT_USERNAME;

        // Fetch HackerNews replies
        if ((platform === 'all' || platform === 'hackernews') && hnUsername) {
            try {
                const comments = await hackerNewsService.getCommentsOnUserPosts(hnUsername, limit);

                for (const comment of comments) {
                    mentions.push(this.hnCommentToMention(comment));
                }
            } catch (error) {
                console.error('HN My Posts fetch error:', error);
            }
        }

        // REDDIT: Commented out until API access is approved
        // // Fetch Reddit replies
        // if ((platform === 'all' || platform === 'reddit') && redditUsername && redditService.isConfigured()) {
        //     try {
        //         const comments = await redditService.getCommentsOnUserPosts(redditUsername, Math.ceil(limit / 2));
        //
        //         for (const comment of comments) {
        //             mentions.push(this.redditCommentToMention(comment));
        //         }
        //     } catch (error) {
        //         console.error('Reddit My Posts fetch error:', error);
        //     }
        // }

        // Sort by date, newest first
        mentions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return {
            mentions: mentions.slice(0, limit),
            total: mentions.length,
            hnUsername
            // REDDIT: redditUsername
        };
    }

    /**
     * Convert HN comment to unified Mention format
     */
    private hnCommentToMention(item: HNItem): Mention {
        return {
            id: `hn-${item.objectID}`,
            platform: 'hackernews',
            mode: 'my-posts',
            type: 'comment',
            content: item.comment_text || item.text || '',
            url: `https://news.ycombinator.com/item?id=${item.objectID}`,
            authorName: item.author,
            parentTitle: item.story_title || item.title,
            parentUrl: item.story_url,
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
    //         mode: 'my-posts',
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
