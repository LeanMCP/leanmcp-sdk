/**
 * Roast Generation Service
 * 
 * Uses OpenAI to generate a humorous roast based on profile analysis.
 */

import { Tool, SchemaConstraint, Optional } from '@leanmcp/core';
import OpenAI from 'openai';
import type { ProfileAnalysis } from '../analysis/index.js';
import type { GitHubProfile } from '../github/index.js';

class GenerateRoastInput {
    @SchemaConstraint({ description: 'GitHub profile data' })
    profile!: GitHubProfile;

    @SchemaConstraint({ description: 'Analyzed profile statistics' })
    analysis!: ProfileAnalysis;

    @Optional()
    @SchemaConstraint({
        description: 'Roast intensity level',
        enum: ['mild', 'medium', 'savage'],
        default: 'medium'
    })
    intensity?: 'mild' | 'medium' | 'savage';
}

export interface RoastResult {
    headline: string;
    verdict: string;
    score: number;
    roastLines: string[];
    improvement: string;
}

export class RoastService {
    private openai: OpenAI | null = null;

    private getOpenAI(): OpenAI {
        if (!this.openai) {
            if (!process.env.OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY not configured');
            }
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
        return this.openai;
    }

    @Tool({
        description: 'Generate a humorous AI roast based on GitHub profile analysis.',
        inputClass: GenerateRoastInput,
    })
    async generateRoast(input: GenerateRoastInput): Promise<{
        success: boolean;
        roast?: RoastResult;
        error?: string;
    }> {
        try {
            const { profile, analysis, intensity = 'medium' } = input;
            const openai = this.getOpenAI();

            const intensityGuide = {
                mild: 'Be playful and light-hearted. Tease gently.',
                medium: 'Be witty and pointed. Include some sharp observations.',
                savage: 'Go hard. No mercy. Maximum burns (but stay tasteful, no personal attacks).',
            };

            const prompt = `You are a GitHub profile roaster. Generate a humorous roast for this developer.

PROFILE:
- Username: ${profile.login}
- Name: ${profile.name || 'Unknown'}
- Bio: ${profile.bio || 'None'}
- Public repos: ${profile.publicRepos}
- Followers: ${profile.followers}
- Following: ${profile.following}
- Account age: ${analysis.accountAge.years} years, ${analysis.accountAge.months} months

STATS:
- Total stars received: ${analysis.totalStars}
- Abandoned repos: ${analysis.abandonedRepos}
- Dominant language: ${analysis.dominantLanguage || 'None'}
- Languages: ${analysis.languages.slice(0, 5).map(l => `${l.name}(${l.count})`).join(', ')}
- Late night commits (12am-5am): ${analysis.lateNightCommits}
- Weekend commits: ${analysis.weekendCommits}
- Bad commit messages: ${analysis.badCommitMessages}
- Repos with license: ${analysis.reposWithLicense}
- Follower ratio: ${analysis.followerRatio}

PRE-GENERATED ROAST POINTS:
${analysis.roastPoints.map(p => `- ${p}`).join('\n')}

INTENSITY: ${intensity} - ${intensityGuide[intensity]}

Generate a JSON response with:
1. "headline" - A short, punchy one-liner roast (under 60 chars)
2. "verdict" - A 1-2 sentence overall verdict
3. "score" - A "Developer Score" from 1-100 (be harsh but fair)
4. "roastLines" - Array of 4-6 specific roast lines based on their stats
5. "improvement" - One genuine, helpful improvement suggestion

Keep it funny but not mean-spirited. No personal attacks, focus on the code/activity.
Do not use emojis anywhere.

Respond with valid JSON only.`;

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                temperature: 0.9,
                max_tokens: 800,
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from OpenAI');
            }

            const roast = JSON.parse(content) as RoastResult;

            return { success: true, roast };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
