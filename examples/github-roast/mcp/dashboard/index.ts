/**
 * Dashboard Entry - @GPTApp wrapper
 * 
 * Opens the GitHub Roast dashboard.
 */

import { Tool } from '@leanmcp/core';
import { GPTApp } from '@leanmcp/ui/server';

/**
 * Check if GitHub auth is configured
 */
function isGitHubConfigured(): boolean {
    // OAuth configured OR personal token available
    return !!(
        (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) ||
        process.env.GITHUB_TOKEN
    );
}

export class DashboardService {
    @Tool({
        description: 'Open the GitHub Roast Dashboard. Analyze your GitHub profile and get a humorous AI-generated roast.',
        // Dashboard is open to all - actual data fetching tools require auth
        securitySchemes: [{ type: 'noauth' }],
    })
    @GPTApp({
        component: './RoastDashboard',
        title: 'GitHub Roast',
    })
    async openRoastDashboard(): Promise<{
        status: string;
        config: {
            githubConfigured: boolean;
            openaiConfigured: boolean;
        };
    }> {
        return {
            status: 'ready',
            config: {
                githubConfigured: isGitHubConfigured(),
                openaiConfigured: !!process.env.OPENAI_API_KEY,
            },
        };
    }
}

