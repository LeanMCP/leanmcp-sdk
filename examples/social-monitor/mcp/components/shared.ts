/**
 * Shared types and utilities for Social Monitor components
 */

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

/**
 * Decode HTML entities using browser's DOMParser
 */
export function decodeHtmlEntities(text: string): string {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return doc.body.textContent || text;
}

/**
 * Parse tool result from MCP response
 */
export function parseToolResult(result: any): any {
    if (!result) return null;
    if (result.result && typeof result.result === 'string') {
        try { return JSON.parse(result.result); } catch { /* fall through */ }
    }
    if (result.content?.[0]?.text) {
        try { return JSON.parse(result.content[0].text); } catch { /* fall through */ }
    }
    if (result.mentions || result.response) return result;
    return null;
}

/**
 * Format timestamp as relative time
 */
export function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return date.toLocaleDateString();
}

/**
 * Robust copy to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    // Strategy 1: Modern Clipboard API
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.warn('Clipboard API failed, trying fallback...', err);
    }

    // Strategy 2: Legacy execCommand
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
    } catch (err) {
        console.error('Copy failed completely', err);
        return false;
    }
}
