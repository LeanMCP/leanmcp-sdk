/**
 * AI Response Service
 * 
 * Generates contextual AI responses based on mention mode and platform.
 * Uses OpenAI API for natural language generation.
 */
import { Tool, SchemaConstraint, Optional } from '@leanmcp/core';
import OpenAI from 'openai';

class GenerateResponseInput {
    @SchemaConstraint({
        description: 'The original mention/comment text to respond to'
    })
    mentionText!: string;

    @SchemaConstraint({
        description: 'The mode determines the response style',
        enum: ['discovery', 'my-posts', 'mentions']
    })
    mode!: 'discovery' | 'my-posts' | 'mentions';

    @SchemaConstraint({
        description: 'Platform for formatting',
        enum: ['reddit', 'hackernews']
    })
    platform!: 'reddit' | 'hackernews';

    @Optional()
    @SchemaConstraint({
        description: 'Response tone',
        enum: ['professional', 'friendly', 'witty'],
        default: 'friendly'
    })
    tone?: 'professional' | 'friendly' | 'witty';

    @Optional()
    @SchemaConstraint({
        description: 'Additional context about the conversation'
    })
    context?: string;
}

// System prompts for each mode
const SYSTEM_PROMPTS = {
    discovery: `You are helping craft a helpful response to a discussion about MCP (Model Context Protocol). 
Your goal is to provide genuine value while naturally mentioning LeanMCP when relevant.

Guidelines:
- Be genuinely helpful first, promotional second
- Only mention LeanMCP if it's truly relevant to their question/discussion
- If mentioning LeanMCP, explain what it offers (TypeScript SDK for building MCP servers with decorators)
- Keep responses concise - under 150 words for comments
- Match the platform's communication style
- Never be salesy or pushy`,

    'my-posts': `You are helping craft a response to someone who commented on your post.
Your goal is to engage positively with the community and foster discussion.

Guidelines:
- Thank them for their engagement or question
- Provide helpful information if they asked something
- Be conversational and friendly
- Encourage further discussion if appropriate
- Keep responses concise - under 100 words typically
- If they had criticism, address it constructively`,

    mentions: `You are helping craft a response to someone who mentioned LeanMCP.
Your goal is to show appreciation and offer help if needed.

Guidelines:
- Thank them for mentioning LeanMCP
- If they had a question, answer it helpfully
- If they shared something positive, express genuine appreciation
- If they had feedback, acknowledge it constructively
- Offer to help if they're trying to build something
- Keep responses warm but concise - under 100 words`
};

const TONE_MODIFIERS = {
    professional: 'Use professional language. Be precise and technical when appropriate.',
    friendly: 'Be warm and approachable. Use casual language where appropriate.',
    witty: 'Add some humor or cleverness, but never at anyone\'s expense. Stay helpful.'
};

const PLATFORM_GUIDELINES = {
    reddit: 'Format for Reddit: Use markdown sparingly. Keep paragraphs short. You can use bullet points if listing multiple things.',
    hackernews: 'Format for HackerNews: Plain text preferred. No markdown. Be substantive and technical. HN values thoughtful, in-depth responses.'
};

export class AIResponseService {
    private openai: OpenAI | null = null;

    constructor() {
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
        }
    }

    /**
     * Generate a contextual AI response
     */
    @Tool({
        description: 'Generate an AI-suggested response for a social media mention. Adapts tone and style based on the mode (discovery, my-posts, mentions) and platform.',
        inputClass: GenerateResponseInput
    })
    async generateResponse(input: GenerateResponseInput): Promise<{
        response: string;
        mode: string;
        tone: string;
        platform: string;
    }> {
        const tone = input.tone ?? 'friendly';

        // If no OpenAI configured, return a template
        if (!this.openai) {
            return {
                response: this.getFallbackResponse(input.mode, input.mentionText),
                mode: input.mode,
                tone,
                platform: input.platform
            };
        }

        const systemPrompt = `${SYSTEM_PROMPTS[input.mode]}

${TONE_MODIFIERS[tone]}

${PLATFORM_GUIDELINES[input.platform]}`;

        const userPrompt = input.context
            ? `Context: ${input.context}\n\nRespond to this:\n"""${input.mentionText}"""`
            : `Respond to this:\n"""${input.mentionText}"""`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 300,
                temperature: 0.9  // Higher temperature for more variety
            });

            const response = completion.choices[0]?.message?.content?.trim() ??
                this.getFallbackResponse(input.mode, input.mentionText);

            return {
                response,
                mode: input.mode,
                tone,
                platform: input.platform
            };
        } catch (error) {
            console.error('[AI Response] OpenAI API error:', error);
            return {
                response: this.getFallbackResponse(input.mode, input.mentionText),
                mode: input.mode,
                tone,
                platform: input.platform
            };
        }
    }

    /**
     * Fallback response templates when OpenAI is not available
     */
    private getFallbackResponse(mode: string, mentionText: string): string {
        switch (mode) {
            case 'discovery':
                return `Great point about MCP! If you're looking for a TypeScript-friendly way to build MCP servers, check out LeanMCP - it uses decorators for a clean DX. Happy to help if you have questions!`;

            case 'my-posts':
                return `Thanks for the comment! Really appreciate you taking the time to engage. Let me know if you have any other questions.`;

            case 'mentions':
                return `Thanks for mentioning LeanMCP! Really appreciate it. Let me know if you have any questions or need help with anything!`;

            default:
                return `Thanks for sharing your thoughts! Happy to discuss further.`;
        }
    }

    /**
     * Check if OpenAI is configured
     */
    isConfigured(): boolean {
        return !!process.env.OPENAI_API_KEY;
    }
}
