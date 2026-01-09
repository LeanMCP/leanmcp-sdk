/**
 * GitHub API Service
 * 
 * Fetches profile data, repositories, and commit history.
 * Uses MCP authorization spec for OAuth with ChatGPT.
 */

import { Tool, createAuthError } from '@leanmcp/core';
import { TokenVerifier } from '@leanmcp/auth/server';

// Types
export interface GitHubProfile {
    login: string;
    name: string | null;
    avatarUrl: string;
    bio: string | null;
    company: string | null;
    location: string | null;
    blog: string | null;
    publicRepos: number;
    publicGists: number;
    followers: number;
    following: number;
    createdAt: string;
    updatedAt: string;
}

export interface GitHubRepo {
    name: string;
    fullName: string;
    description: string | null;
    language: string | null;
    stars: number;
    forks: number;
    isPrivate: boolean;
    isFork: boolean;
    hasReadme: boolean;
    hasLicense: boolean;
    createdAt: string;
    updatedAt: string;
    pushedAt: string;
    size: number;
}

export interface CommitStats {
    total: number;
    hourDistribution: Record<number, number>;
    dayDistribution: Record<number, number>;
    messagePatterns: {
        fixes: number;
        wip: number;
        short: number;
        noDescription: number;
    };
    recentMessages: string[];
}

class ProfileInput {
    username?: string;
}

/**
 * Get resource metadata URL
 */
function getResourceMetadataUrl(): string {
    const publicUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3300}`;
    return `${publicUrl}/.well-known/oauth-protected-resource`;
}

export class GitHubService {
    private verifier: TokenVerifier;

    constructor() {
        const publicUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3300}`;
        const jwtSigningSecret = process.env.JWT_SIGNING_SECRET || process.env.SESSION_SECRET;
        const jwtEncryptionSecret = process.env.JWT_ENCRYPTION_SECRET
            ? Buffer.from(process.env.JWT_ENCRYPTION_SECRET, 'hex')
            : Buffer.from((process.env.SESSION_SECRET || '').padEnd(64, '0').slice(0, 64), 'hex');

        if (!jwtSigningSecret) {
            throw new Error('JWT_SIGNING_SECRET or SESSION_SECRET is required');
        }

        this.verifier = new TokenVerifier({
            issuer: publicUrl,
            audience: publicUrl,
            secret: jwtSigningSecret,
            encryptionSecret: jwtEncryptionSecret,
        });
    }

    /**
     * Get upstream GitHub token from JWT
     * ChatGPT sends the JWT in the _meta.authToken field
     * We verify the JWT and decrypt the upstream GitHub token
     */
    private async getAccessToken(meta?: { authToken?: string }): Promise<string | null> {
        // Check if token is in meta (from ChatGPT)
        if (meta?.authToken) {
            try {
                const result = await this.verifier.verify(meta.authToken);

                if (result.valid && result.upstreamToken) {
                    // Successfully decrypted upstream GitHub token from JWT
                    return result.upstreamToken;
                } else if (!result.valid) {
                    console.warn('[GitHubService] Token verification failed:', result.error);
                }
            } catch (error: any) {
                console.warn('[GitHubService] Token verification error:', error.message);
            }
        }

        // Fallback to environment variable for local testing
        if (process.env.GITHUB_TOKEN) {
            console.warn('[GitHubService] Using GITHUB_TOKEN from environment (for local testing only)');
            return process.env.GITHUB_TOKEN;
        }

        return null;
    }

    /**
     * Fetch from GitHub API with authentication
     */
    private async fetchWithAuth(url: string, token: string): Promise<any> {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'github-roast-mcp',
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('GitHub token is invalid or expired');
            }
            throw new Error(`GitHub API error: ${response.status}`);
        }

        return response.json();
    }

    @Tool({
        description: 'Check authentication status with GitHub.',
        securitySchemes: [
            { type: 'noauth' },  // Can check without auth
            { type: 'oauth2', scopes: ['read:user'] },  // But works better with auth
        ],
    })
    async checkAuth(_input: Record<string, unknown>, meta?: { authToken?: string }): Promise<{
        authenticated: boolean;
        user?: { id: string; name: string; email?: string; picture?: string };
        message: string;
    }> {
        const token = await this.getAccessToken(meta);

        if (!token) {
            return {
                authenticated: false,
                message: 'Not authenticated. Please sign in with GitHub.',
            };
        }

        try {
            const userData = await this.fetchWithAuth('https://api.github.com/user', token);

            return {
                authenticated: true,
                user: {
                    id: userData.login,
                    name: userData.name || userData.login,
                    email: userData.email,
                    picture: userData.avatar_url,
                },
                message: `Authenticated as ${userData.login}`,
            };
        } catch (error: any) {
            return {
                authenticated: false,
                message: `Authentication check failed: ${error.message}`,
            };
        }
    }

    @Tool({
        description: 'Fetch GitHub profile data for the authenticated user or a specified username.',
        inputClass: ProfileInput,
        securitySchemes: [
            { type: 'noauth' },
            { type: 'oauth2', scopes: ['read:user'] }
        ],
    })
    async fetchGitHubProfile(input: ProfileInput, meta?: { authToken?: string }): Promise<any> {
        const token = await this.getAccessToken(meta);

        if (!token) {
            // Return MCP auth error to trigger ChatGPT OAuth UI
            return createAuthError(
                'Please authenticate with GitHub to view profile data',
                {
                    resourceMetadataUrl: getResourceMetadataUrl(),
                    error: 'invalid_token',
                    errorDescription: 'No access token provided',
                }
            );
        }

        try {
            const url = input.username
                ? `https://api.github.com/users/${input.username}`
                : 'https://api.github.com/user';

            const data = await this.fetchWithAuth(url, token);

            return {
                success: true,
                profile: {
                    login: data.login,
                    name: data.name,
                    avatarUrl: data.avatar_url,
                    bio: data.bio,
                    company: data.company,
                    location: data.location,
                    blog: data.blog,
                    publicRepos: data.public_repos,
                    publicGists: data.public_gists,
                    followers: data.followers,
                    following: data.following,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at,
                },
            };
        } catch (error: any) {
            if (error.message.includes('401') || error.message.includes('invalid')) {
                return createAuthError(
                    'Your GitHub session has expired. Please re-authenticate.',
                    {
                        resourceMetadataUrl: getResourceMetadataUrl(),
                        error: 'expired_token',
                        errorDescription: 'Token expired or invalid',
                    }
                );
            }

            return {
                success: false,
                error: error.message,
            };
        }
    }

    @Tool({
        description: 'Fetch all repositories for the authenticated user.',
        inputClass: ProfileInput,
        securitySchemes: [
            { type: 'noauth' },
            { type: 'oauth2', scopes: ['read:user', 'repo'] }
        ],
    })
    async fetchGitHubRepos(input: ProfileInput, meta?: { authToken?: string }): Promise<any> {
        const token = await this.getAccessToken(meta);

        if (!token) {
            return createAuthError(
                'Please authenticate with GitHub to view repositories',
                {
                    resourceMetadataUrl: getResourceMetadataUrl(),
                    error: 'invalid_token',
                    errorDescription: 'No access token provided',
                }
            );
        }

        try {
            const url = input.username
                ? `https://api.github.com/users/${input.username}/repos?per_page=100&sort=updated`
                : 'https://api.github.com/user/repos?per_page=100&sort=updated';

            const data = await this.fetchWithAuth(url, token);

            const repos: GitHubRepo[] = data.map((repo: any) => ({
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description,
                language: repo.language,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                isPrivate: repo.private,
                isFork: repo.fork,
                hasReadme: true, // Would need additional API call to verify
                hasLicense: !!repo.license,
                createdAt: repo.created_at,
                updatedAt: repo.updated_at,
                pushedAt: repo.pushed_at,
                size: repo.size,
            }));

            return { success: true, repos };
        } catch (error: any) {
            if (error.message.includes('401')) {
                return createAuthError(
                    'Your GitHub session has expired',
                    {
                        resourceMetadataUrl: getResourceMetadataUrl(),
                        error: 'expired_token',
                    }
                );
            }
            return { success: false, error: error.message };
        }
    }

    @Tool({
        description: 'Fetch recent commit statistics from repositories.',
        inputClass: ProfileInput,
        securitySchemes: [
            { type: 'noauth' },
            { type: 'oauth2', scopes: ['read:user', 'repo'] }
        ],
    })
    async fetchCommitStats(input: ProfileInput, meta?: { authToken?: string }): Promise<any> {
        const token = await this.getAccessToken(meta);

        if (!token) {
            return createAuthError(
                'Please authenticate with GitHub to view commit statistics',
                {
                    resourceMetadataUrl: getResourceMetadataUrl(),
                    error: 'invalid_token',
                    errorDescription: 'No access token provided',
                }
            );
        }

        try {
            // Get repos first
            const reposResult = await this.fetchGitHubRepos(input, meta);
            if (!reposResult.success || !reposResult.repos) {
                return reposResult; // Pass through auth errors
            }

            // Sample commits from top 5 most recently updated non-fork repos
            const activeRepos = reposResult.repos
                .filter((r: GitHubRepo) => !r.isFork)
                .slice(0, 5);

            const hourDistribution: Record<number, number> = {};
            const dayDistribution: Record<number, number> = {};
            const messagePatterns = { fixes: 0, wip: 0, short: 0, noDescription: 0 };
            const recentMessages: string[] = [];
            let total = 0;

            for (const repo of activeRepos) {
                try {
                    const commits = await this.fetchWithAuth(
                        `https://api.github.com/repos/${repo.fullName}/commits?per_page=30`,
                        token
                    );

                    for (const commit of commits) {
                        total++;
                        const date = new Date(commit.commit.author.date);
                        const hour = date.getHours();
                        const day = date.getDay();

                        hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
                        dayDistribution[day] = (dayDistribution[day] || 0) + 1;

                        const msg = commit.commit.message.toLowerCase();
                        if (msg.includes('fix')) messagePatterns.fixes++;
                        if (msg.includes('wip') || msg.includes('work in progress')) messagePatterns.wip++;
                        if (msg.split('\n')[0].length < 10) messagePatterns.short++;
                        if (!msg.includes('\n')) messagePatterns.noDescription++;

                        if (recentMessages.length < 10) {
                            recentMessages.push(commit.commit.message.split('\n')[0]);
                        }
                    }
                } catch {
                    // Skip repos we can't access
                }
            }

            return {
                success: true,
                stats: { total, hourDistribution, dayDistribution, messagePatterns, recentMessages },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
