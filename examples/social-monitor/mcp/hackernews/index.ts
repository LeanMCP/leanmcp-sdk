/**
 * HackerNews Service - Algolia API wrapper
 * 
 * Uses the free Algolia HN Search API:
 * - No auth required
 * - 10,000 requests/hour rate limit
 * - Full-text search on stories and comments
 */
import axios from 'axios';

const ALGOLIA_BASE = 'https://hn.algolia.com/api/v1';

export interface HNItem {
    objectID: string;
    type: 'story' | 'comment';
    author: string;
    title?: string;           // For stories
    story_title?: string;     // For comments (parent story title)
    story_url?: string;       // For comments (parent story URL)
    url?: string;             // For stories
    text?: string;            // Comment text or story text
    comment_text?: string;    // Alternative field for comment text
    created_at: string;
    created_at_i: number;
    points?: number;
    num_comments?: number;
    parent_id?: number;
    story_id?: number;
    children?: HNItem[];      // Nested comments when fetching item
}

export interface HNSearchResult {
    hits: HNItem[];
    nbHits: number;
    page: number;
    nbPages: number;
    hitsPerPage: number;
}

export interface HNUser {
    username: string;
    about?: string;
    karma: number;
    created_at: string;
    submitted: number[];      // Array of item IDs
}

export class HackerNewsService {
    /**
     * Search HackerNews by keyword
     * Searches both stories and comments
     */
    async searchByKeyword(query: string, options: {
        tags?: 'story' | 'comment' | '(story,comment)';
        limit?: number;
        page?: number;
    } = {}): Promise<HNSearchResult> {
        const { tags = 'comment', limit = 20, page = 0 } = options;

        const response = await axios.get<HNSearchResult>(`${ALGOLIA_BASE}/search`, {
            params: {
                query,
                tags,
                hitsPerPage: limit,
                page,
            }
        });

        return response.data;
    }

    /**
     * Search by date (most recent first)
     */
    async searchByDate(query: string, options: {
        tags?: 'story' | 'comment';
        limit?: number;
    } = {}): Promise<HNSearchResult> {
        const { tags = 'comment', limit = 20 } = options;

        const response = await axios.get<HNSearchResult>(`${ALGOLIA_BASE}/search_by_date`, {
            params: {
                query,
                tags,
                hitsPerPage: limit,
            }
        });

        return response.data;
    }

    /**
     * Get user profile with submitted items
     */
    async getUserProfile(username: string): Promise<HNUser | null> {
        try {
            const response = await axios.get<HNUser>(`${ALGOLIA_BASE}/users/${username}`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Get item with all nested comments
     */
    async getItemWithComments(itemId: string): Promise<HNItem | null> {
        try {
            const response = await axios.get<HNItem>(`${ALGOLIA_BASE}/items/${itemId}`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Get user's submissions (stories they posted)
     */
    async getUserSubmissions(username: string, limit = 10): Promise<HNItem[]> {
        // Search for stories by this author
        const result = await this.searchByDate('', {
            tags: 'story',
            limit,
        });

        // The Algolia API doesn't have a direct "author filter" in URL,
        // so we search recent stories and filter if needed
        // Alternative: use author_{username} tag
        const response = await axios.get<HNSearchResult>(`${ALGOLIA_BASE}/search_by_date`, {
            params: {
                tags: `story,author_${username}`,
                hitsPerPage: limit,
            }
        });

        return response.data.hits;
    }

    /**
     * Get comments on a user's posts
     * Returns comments from other users on the user's stories
     */
    async getCommentsOnUserPosts(username: string, limit = 50): Promise<HNItem[]> {
        // First get user's submissions
        const submissions = await this.getUserSubmissions(username, 10);

        const allComments: HNItem[] = [];

        // Fetch comments for each submission
        for (const story of submissions.slice(0, 5)) {
            const storyWithComments = await this.getItemWithComments(story.objectID);
            if (storyWithComments?.children) {
                // Flatten first-level comments (not from the author)
                const otherComments = this.flattenComments(storyWithComments.children)
                    .filter(c => c.author !== username)
                    .slice(0, 10);
                allComments.push(...otherComments);
            }
        }

        return allComments.slice(0, limit);
    }

    /**
     * Flatten nested comments into a single array
     */
    private flattenComments(comments: HNItem[], depth = 0): HNItem[] {
        const result: HNItem[] = [];

        for (const comment of comments) {
            result.push({ ...comment, type: 'comment' });
            if (comment.children && depth < 2) {
                result.push(...this.flattenComments(comment.children, depth + 1));
            }
        }

        return result;
    }
}

// Export singleton instance
export const hackerNewsService = new HackerNewsService();
