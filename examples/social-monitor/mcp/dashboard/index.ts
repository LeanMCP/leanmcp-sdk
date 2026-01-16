/**
 * Dashboard Entry - @GPTApp wrapper
 * 
 * This file registers the unified dashboard that serves all three tabs.
 */
import { Tool, SchemaConstraint, Optional } from '@leanmcp/core';
import { GPTApp } from '@leanmcp/ui/server';
// REDDIT: Commented out until API access is approved
// import { redditService } from '../reddit/index.js';

class DashboardInput {
    @Optional()
    @SchemaConstraint({
        description: 'Initial tab to display',
        enum: ['discovery', 'my-posts', 'mentions'],
        default: 'discovery'
    })
    initialTab?: 'discovery' | 'my-posts' | 'mentions';
}

// REDDIT: Commented out until API access is approved
// class RedditReplyInput {
//     @SchemaConstraint({ description: 'Reddit fullname of parent (t1_xxx or t3_xxx)' })
//     parentId!: string;
//
//     @SchemaConstraint({ description: 'Reply text content' })
//     text!: string;
// }

export class DashboardService {
    /**
     * Open the Social Monitor Dashboard
     * Unified dashboard with three tabs for social engagement
     */
    @Tool({
        description: 'Open the Social Monitor Dashboard with three tabs: MCP Discovery, My Posts, and LeanMCP Mentions. Helps you engage with your HackerNews community.',
        inputClass: DashboardInput
    })
    @GPTApp({
        component: './SocialMonitorDashboard',
        title: 'Social Monitor'
    })
    async openDashboard(input: DashboardInput): Promise<{
        status: string;
        initialTab: string;
        config: {
            hnUsername?: string;
            // REDDIT: redditUsername?: string;
            // REDDIT: redditConfigured: boolean;
            openaiConfigured: boolean;
        };
    }> {
        return {
            status: 'ready',
            initialTab: input.initialTab ?? 'discovery',
            config: {
                hnUsername: process.env.HN_USERNAME,
                // REDDIT: redditUsername: process.env.REDDIT_USERNAME,
                // REDDIT: redditConfigured: redditService.isConfigured(),
                openaiConfigured: !!process.env.OPENAI_API_KEY
            }
        };
    }

    // REDDIT: Commented out until API access is approved
    // /**
    //  * Post a reply to Reddit
    //  * Used by the dashboard to send responses
    //  */
    // @Tool({
    //     description: 'Post a reply to a Reddit comment. Requires Reddit OAuth configuration.',
    //     inputClass: RedditReplyInput
    // })
    // async postRedditReply(input: RedditReplyInput): Promise<{
    //     success: boolean;
    //     message: string;
    //     commentId?: string;
    // }> {
    //     if (!redditService.isConfigured()) {
    //         return {
    //             success: false,
    //             message: 'Reddit OAuth not configured. Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD in .env'
    //         };
    //     }
    //
    //     try {
    //         const comment = await redditService.postReply(input.parentId, input.text);
    //         return {
    //             success: true,
    //             message: 'Reply posted successfully!',
    //             commentId: comment?.id
    //         };
    //     } catch (error) {
    //         return {
    //             success: false,
    //             message: `Failed to post reply: ${error instanceof Error ? error.message : 'Unknown error'}`
    //         };
    //     }
    // }
}
