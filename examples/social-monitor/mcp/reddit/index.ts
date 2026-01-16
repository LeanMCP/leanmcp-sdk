/**
 * Reddit Service - OAuth API wrapper
 * 
 * Uses Reddit OAuth2 for authenticated requests:
 * - Free tier: 100 requests/minute
 * - Requires app registration at reddit.com/prefs/apps
 */
import axios, { AxiosInstance } from 'axios';

const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/access_token';
const REDDIT_API_URL = 'https://oauth.reddit.com';

export interface RedditComment {
    id: string;
    name: string;              // Fullname (t1_xxxxx for comments)
    author: string;
    body: string;
    body_html: string;
    created_utc: number;
    permalink: string;
    link_title?: string;       // Title of the parent post
    link_id?: string;          // Parent post ID
    parent_id?: string;        // Parent comment ID
    subreddit: string;
    score: number;
    replies?: RedditListing;
}

export interface RedditPost {
    id: string;
    name: string;              // Fullname (t3_xxxxx for posts)
    author: string;
    title: string;
    selftext: string;
    selftext_html?: string;
    url: string;
    permalink: string;
    created_utc: number;
    subreddit: string;
    score: number;
    num_comments: number;
}

export interface RedditListing {
    kind: 'Listing';
    data: {
        children: Array<{
            kind: 't1' | 't3';
            data: RedditComment | RedditPost;
        }>;
        after?: string;
        before?: string;
    };
}

export class RedditService {
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: REDDIT_API_URL,
            headers: {
                'User-Agent': 'SocialMonitor/1.0 (by /u/' + (process.env.REDDIT_USERNAME || 'unknown') + ')',
            }
        });
    }

    /**
     * Get OAuth access token using password grant
     */
    private async getAccessToken(): Promise<string> {
        // Return cached token if still valid
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        const clientId = process.env.REDDIT_CLIENT_ID;
        const clientSecret = process.env.REDDIT_CLIENT_SECRET;
        const username = process.env.REDDIT_USERNAME;
        const password = process.env.REDDIT_PASSWORD;

        if (!clientId || !clientSecret || !username || !password) {
            throw new Error('Reddit OAuth credentials not configured. Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD');
        }

        const response = await axios.post(
            REDDIT_AUTH_URL,
            new URLSearchParams({
                grant_type: 'password',
                username,
                password,
            }),
            {
                auth: {
                    username: clientId,
                    password: clientSecret,
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'SocialMonitor/1.0',
                }
            }
        );

        this.accessToken = response.data.access_token;
        // Token expires in ~1 hour, refresh 5 min early
        this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

        return this.accessToken!;
    }

    /**
     * Make authenticated request to Reddit API
     */
    private async request<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
        const token = await this.getAccessToken();

        const response = await this.client.get<T>(endpoint, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            params,
        });

        return response.data;
    }

    /**
     * Search Reddit by keyword
     */
    async searchByKeyword(query: string, options: {
        type?: 'link' | 'comment';
        subreddit?: string;
        limit?: number;
        sort?: 'relevance' | 'new' | 'hot';
    } = {}): Promise<(RedditComment | RedditPost)[]> {
        const { type = 'comment', limit = 25, sort = 'new', subreddit } = options;

        const endpoint = subreddit ? `/r/${subreddit}/search` : '/search';

        const listing = await this.request<RedditListing>(endpoint, {
            q: query,
            type,
            limit,
            sort,
            restrict_sr: subreddit ? true : undefined,
        });

        return listing.data.children.map(child => child.data);
    }

    /**
     * Get user's submitted posts
     */
    async getUserSubmissions(username: string, limit = 25): Promise<RedditPost[]> {
        const listing = await this.request<RedditListing>(`/user/${username}/submitted`, {
            limit,
            sort: 'new',
        });

        return listing.data.children
            .filter(child => child.kind === 't3')
            .map(child => child.data as RedditPost);
    }

    /**
     * Get comments on a post
     */
    async getPostComments(postId: string, limit = 50): Promise<RedditComment[]> {
        // Reddit returns [post, comments] as array of listings
        const response = await this.request<[RedditListing, RedditListing]>(
            `/comments/${postId}`,
            { limit, sort: 'new' }
        );

        const commentsListing = response[1];
        return this.flattenComments(commentsListing);
    }

    /**
     * Get comments on user's posts
     */
    async getCommentsOnUserPosts(username: string, limit = 50): Promise<RedditComment[]> {
        const posts = await this.getUserSubmissions(username, 10);
        const allComments: RedditComment[] = [];

        for (const post of posts.slice(0, 5)) {
            try {
                const comments = await this.getPostComments(post.id, 20);
                // Filter out user's own comments
                const otherComments = comments.filter(c => c.author !== username);
                allComments.push(...otherComments);
            } catch (error) {
                console.error(`Error fetching comments for post ${post.id}:`, error);
            }
        }

        return allComments.slice(0, limit);
    }

    /**
     * Post a reply to a comment or post
     */
    async postReply(parentFullname: string, text: string): Promise<RedditComment | null> {
        const token = await this.getAccessToken();

        const response = await axios.post(
            `${REDDIT_API_URL}/api/comment`,
            new URLSearchParams({
                thing_id: parentFullname,
                text,
            }),
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'SocialMonitor/1.0',
                }
            }
        );

        // Reddit returns the created comment in json.data.things[0].data
        const things = response.data?.json?.data?.things;
        if (things && things.length > 0) {
            return things[0].data as RedditComment;
        }

        return null;
    }

    /**
     * Flatten nested comments
     */
    private flattenComments(listing: RedditListing, depth = 0): RedditComment[] {
        const result: RedditComment[] = [];

        for (const child of listing.data.children) {
            if (child.kind === 't1') {
                const comment = child.data as RedditComment;
                result.push(comment);

                // Recursively get nested replies (max 2 levels)
                if (comment.replies && typeof comment.replies === 'object' && depth < 2) {
                    result.push(...this.flattenComments(comment.replies, depth + 1));
                }
            }
        }

        return result;
    }

    /**
     * Check if Reddit credentials are configured
     */
    isConfigured(): boolean {
        return !!(
            process.env.REDDIT_CLIENT_ID &&
            process.env.REDDIT_CLIENT_SECRET &&
            process.env.REDDIT_USERNAME &&
            process.env.REDDIT_PASSWORD
        );
    }
}

// Export singleton instance
export const redditService = new RedditService();
