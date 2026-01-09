/**
 * Profile Analysis Service
 * 
 * Analyzes GitHub profile data and generates statistics for roasting.
 */

import { Tool, SchemaConstraint } from '@leanmcp/core';
import type { GitHubProfile, GitHubRepo, CommitStats } from '../github/index.js';

export interface ProfileAnalysis {
    // Basic stats
    accountAge: { years: number; months: number };
    totalRepos: number;
    ownRepos: number; // Non-forks

    // Quality metrics
    reposWithReadme: number;
    reposWithLicense: number;
    reposWithDescription: number;

    // Activity
    totalStars: number;
    totalForks: number;
    avgStarsPerRepo: number;
    abandonedRepos: number; // No update in 6+ months

    // Languages
    languages: { name: string; count: number }[];
    dominantLanguage: string | null;
    configFileRatio: number; // JSON, YAML, etc. repos

    // Commit patterns
    lateNightCommits: number; // 12am-5am
    weekendCommits: number;
    badCommitMessages: number;

    // Follower ratio
    followerRatio: number; // followers / following

    // Roast material
    roastPoints: string[];
}

class AnalyzeInput {
    @SchemaConstraint({ description: 'GitHub profile data' })
    profile!: GitHubProfile;

    @SchemaConstraint({ description: 'Repository list' })
    repos!: GitHubRepo[];

    @SchemaConstraint({ description: 'Commit statistics' })
    commitStats!: CommitStats;
}

export class AnalysisService {
    @Tool({
        description: 'Analyze GitHub profile data and generate roast-worthy statistics.',
        inputClass: AnalyzeInput,
    })
    async analyzeProfile(input: AnalyzeInput): Promise<{
        success: boolean;
        analysis?: ProfileAnalysis;
        error?: string;
    }> {
        try {
            const { profile, repos, commitStats } = input;

            // Calculate account age
            const created = new Date(profile.createdAt);
            const now = new Date();
            const ageMs = now.getTime() - created.getTime();
            const ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
            const ageMonths = Math.floor((ageMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));

            // Repository analysis
            const ownRepos = repos.filter(r => !r.isFork);
            const withLicense = repos.filter(r => r.hasLicense).length;
            const withDescription = repos.filter(r => r.description && r.description.length > 0).length;
            const totalStars = repos.reduce((sum, r) => sum + r.stars, 0);
            const totalForks = repos.reduce((sum, r) => sum + r.forks, 0);

            // Abandoned repos (no push in 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const abandonedRepos = repos.filter(r => new Date(r.pushedAt) < sixMonthsAgo).length;

            // Language breakdown
            const langCounts: Record<string, number> = {};
            for (const repo of repos) {
                if (repo.language) {
                    langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
                }
            }
            const languages = Object.entries(langCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count);

            const configLangs = ['JSON', 'YAML', 'Markdown', 'Text', 'Dockerfile'];
            const configRepos = repos.filter(r => configLangs.includes(r.language || '')).length;
            const configFileRatio = repos.length > 0 ? configRepos / repos.length : 0;

            // Commit patterns
            let lateNightCommits = 0;
            let weekendCommits = 0;
            for (const [hour, count] of Object.entries(commitStats.hourDistribution)) {
                const h = parseInt(hour);
                if (h >= 0 && h <= 5) lateNightCommits += count;
            }
            for (const [day, count] of Object.entries(commitStats.dayDistribution)) {
                const d = parseInt(day);
                if (d === 0 || d === 6) weekendCommits += count;
            }

            const badCommitMessages =
                commitStats.messagePatterns.wip +
                commitStats.messagePatterns.short;

            // Follower ratio
            const followerRatio = profile.following > 0
                ? profile.followers / profile.following
                : profile.followers;

            // Generate roast points
            const roastPoints: string[] = [];

            if (totalStars === 0) {
                roastPoints.push(`${ownRepos.length} repos and not a single star. Even your mom scrolled past.`);
            } else if (totalStars < 10) {
                roastPoints.push(`${totalStars} total stars. That's fewer than a participation trophy.`);
            }

            if (abandonedRepos > repos.length * 0.5) {
                roastPoints.push(`${abandonedRepos} abandoned repos. Your GitHub is a graveyard of "I'll finish this later."`);
            }

            if (lateNightCommits > commitStats.total * 0.3) {
                roastPoints.push(`${Math.round((lateNightCommits / commitStats.total) * 100)}% of your commits are between midnight and 5am. Sleep is overrated anyway.`);
            }

            if (commitStats.messagePatterns.fixes > commitStats.total * 0.4) {
                roastPoints.push(`${commitStats.messagePatterns.fixes} of your commits contain "fix". Have you tried writing working code the first time?`);
            }

            if (commitStats.messagePatterns.wip > 5) {
                roastPoints.push(`${commitStats.messagePatterns.wip} "WIP" commits. Those are still in progress, right?`);
            }

            if (commitStats.messagePatterns.short > commitStats.total * 0.3) {
                roastPoints.push(`${Math.round((commitStats.messagePatterns.short / commitStats.total) * 100)}% of your commit messages are under 10 characters. "asdf" is not a description.`);
            }

            if (withLicense < ownRepos.length * 0.2) {
                roastPoints.push(`Only ${withLicense} repos have a license. Lawyers love this one weird trick.`);
            }

            if (followerRatio < 0.5 && profile.following > 20) {
                roastPoints.push(`Following ${profile.following} people but only ${profile.followers} follow back. It's giving main character syndrome.`);
            }

            if (ageYears > 5 && totalStars < 50) {
                roastPoints.push(`${ageYears} years on GitHub with ${totalStars} stars. That's ${(totalStars / ageYears).toFixed(1)} stars per year. Glacial.`);
            }

            if (configFileRatio > 0.3) {
                roastPoints.push(`${Math.round(configFileRatio * 100)}% of your repos are config files. Are you a developer or a YAML translator?`);
            }

            const analysis: ProfileAnalysis = {
                accountAge: { years: ageYears, months: ageMonths },
                totalRepos: repos.length,
                ownRepos: ownRepos.length,
                reposWithReadme: repos.length, // Assume all have readme for now
                reposWithLicense: withLicense,
                reposWithDescription: withDescription,
                totalStars,
                totalForks,
                avgStarsPerRepo: repos.length > 0 ? Math.round(totalStars / repos.length * 10) / 10 : 0,
                abandonedRepos,
                languages,
                dominantLanguage: languages[0]?.name || null,
                configFileRatio,
                lateNightCommits,
                weekendCommits,
                badCommitMessages,
                followerRatio: Math.round(followerRatio * 100) / 100,
                roastPoints,
            };

            return { success: true, analysis };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
