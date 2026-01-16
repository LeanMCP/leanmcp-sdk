/**
 * GitHub Roast Dashboard - Main UI Component
 * 
 * Clean, minimal UI for GitHub profile roasting.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useGptApp, useGptTool, useToolOutput } from '@leanmcp/ui';

// Types
interface GitHubProfile {
    login: string;
    name: string | null;
    avatarUrl: string;
    bio: string | null;
    publicRepos: number;
    followers: number;
    following: number;
    createdAt: string;
}

interface ProfileAnalysis {
    accountAge: { years: number; months: number };
    totalRepos: number;
    ownRepos: number;
    totalStars: number;
    totalForks: number;
    abandonedRepos: number;
    languages: { name: string; count: number }[];
    dominantLanguage: string | null;
    lateNightCommits: number;
    weekendCommits: number;
    badCommitMessages: number;
    followerRatio: number;
    roastPoints: string[];
}

interface RoastResult {
    headline: string;
    verdict: string;
    score: number;
    roastLines: string[];
    improvement: string;
}

type AppState = 'initial' | 'authenticating' | 'loading' | 'roasted' | 'error';

export function RoastDashboard() {
    const { isConnected } = useGptApp();
    const toolOutput = useToolOutput<any>();

    if (!isConnected) {
        return <LoadingScreen message="Connecting..." />;
    }

    const config = toolOutput?.config || {};

    if (!config.githubConfigured) {
        return <ConfigError type="github" />;
    }

    if (!config.openaiConfigured) {
        return <ConfigError type="openai" />;
    }

    return <DashboardContent />;
}

function LoadingScreen({ message }: { message: string }) {
    return (
        <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
                <div className="w-5 h-5 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">{message}</p>
            </div>
        </div>
    );
}

function ConfigError({ type }: { type: 'github' | 'openai' }) {
    const messages = {
        github: {
            title: 'GitHub OAuth Required',
            desc: 'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env',
        },
        openai: {
            title: 'OpenAI API Key Required',
            desc: 'Set OPENAI_API_KEY in .env for roast generation',
        },
    };

    return (
        <div className="flex items-center justify-center py-12">
            <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-md text-center shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{messages[type].title}</h2>
                <p className="text-sm text-gray-500">{messages[type].desc}</p>
            </div>
        </div>
    );
}

function DashboardContent() {
    const [state, setState] = useState<AppState>('initial');
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = useState<GitHubProfile | null>(null);
    const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);
    const [roast, setRoast] = useState<RoastResult | null>(null);
    const [intensity, setIntensity] = useState<'mild' | 'medium' | 'savage'>('medium');

    // Use checkAuth for auth status, fetchGitHubProfile will trigger OAuth if needed
    const { call: checkAuth, loading: authLoading } = useGptTool('checkAuth');
    const { call: fetchProfile } = useGptTool('fetchGitHubProfile');
    const { call: fetchRepos } = useGptTool('fetchGitHubRepos');
    const { call: fetchCommits } = useGptTool('fetchCommitStats');
    const { call: analyze } = useGptTool('analyzeProfile');
    const { call: generateRoast, loading: roastLoading } = useGptTool('generateRoast');

    // Auto-start authentication check
    useEffect(() => {
        handleAuth();
    }, []);

    /**
     * Check if result is an auth error (MCP www_authenticate response)
     */
    const isAuthError = (result: any): boolean => {
        if (!result) return false;
        const parsed = parseResult(result);
        return parsed?.isError && parsed?._meta?.['mcp/www_authenticate'];
    };

    const handleAuth = useCallback(async () => {
        setState('authenticating');
        setError(null);

        try {
            // First try to fetch profile - if user isn't authenticated,
            // ChatGPT will automatically show OAuth UI when it receives
            // the _meta["mcp/www_authenticate"] response
            const profileResult = parseResult(await fetchProfile({}));

            if (isAuthError(profileResult)) {
                // Auth error returned - ChatGPT should show OAuth UI
                // User will click button again after authenticating
                setError('Please authenticate with GitHub to continue');
                setState('error');
                return;
            }

            if (!profileResult?.success) {
                throw new Error(profileResult?.error || 'Failed to fetch profile');
            }

            // User is authenticated, proceed to load full profile
            setState('loading');
            await loadProfileWithData(profileResult.profile);
        } catch (err: any) {
            setError(err.message);
            setState('error');
        }
    }, [fetchProfile]);

    const loadProfileWithData = useCallback(async (profileData: GitHubProfile) => {
        try {
            setProfile(profileData);

            // Fetch repos
            const reposResult = parseResult(await fetchRepos({}));
            if (isAuthError(reposResult)) {
                setError('Session expired. Please authenticate again.');
                setState('initial');
                return;
            }
            if (!reposResult?.success) throw new Error('Failed to fetch repos');

            // Fetch commit stats
            const commitsResult = parseResult(await fetchCommits({}));
            if (!commitsResult?.success) throw new Error('Failed to fetch commits');

            // Analyze
            const analysisResult = parseResult(await analyze({
                profile: profileData,
                repos: reposResult.repos,
                commitStats: commitsResult.stats,
            }));
            if (!analysisResult?.success) throw new Error('Failed to analyze profile');
            setAnalysis(analysisResult.analysis);

            // Generate roast
            const roastResult = parseResult(await generateRoast({
                profile: profileData,
                analysis: analysisResult.analysis,
                intensity,
            }));
            if (!roastResult?.success) throw new Error('Failed to generate roast');
            setRoast(roastResult.roast);

            setState('roasted');
        } catch (err: any) {
            setError(err.message);
            setState('error');
        }
    }, [fetchRepos, fetchCommits, analyze, generateRoast, intensity]);

    const handleRegenerate = useCallback(async () => {
        if (!profile || !analysis) return;

        try {
            const roastResult = parseResult(await generateRoast({
                profile,
                analysis,
                intensity,
            }));
            if (!roastResult?.success) throw new Error('Failed to regenerate');
            setRoast(roastResult.roast);
        } catch (err: any) {
            setError(err.message);
        }
    }, [profile, analysis, intensity, generateRoast]);

    const handleReset = () => {
        setState('initial');
        setProfile(null);
        setAnalysis(null);
        setRoast(null);
        setError(null);
    };

    return (
        <div className="bg-gray-50 text-gray-900 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                    <h1 className="font-semibold text-lg tracking-tight">GitHub Roast</h1>
                    {state === 'roasted' && (
                        <button
                            onClick={handleReset}
                            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            Start Over
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6">
                <div className="flex flex-col gap-6">
                    {/* Auto-start auth check on mount/initial state */}
                    {(state === 'initial' || state === 'authenticating') && (
                        <LoadingScreen message="Checking authentication..." />
                    )}

                    {state === 'loading' && (
                        <LoadingScreen message="Analyzing your profile..." />
                    )}

                    {state === 'error' && (
                        <ErrorView error={error} onRetry={handleAuth} />
                    )}

                    {state === 'roasted' && profile && analysis && roast && (
                        <RoastCard
                            profile={profile}
                            analysis={analysis}
                            roast={roast}
                            intensity={intensity}
                            onIntensityChange={setIntensity}
                            onRegenerate={handleRegenerate}
                            loading={roastLoading}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}



function ErrorView({ error, onRetry }: { error: string | null; onRetry: () => void }) {
    return (
        <div className="text-center py-16">
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
                {error || 'Something went wrong'}
            </div>
            <button
                onClick={onRetry}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
                Try Again
            </button>
        </div>
    );
}

function RoastCard({
    profile,
    analysis,
    roast,
    intensity,
    onIntensityChange,
    onRegenerate,
    loading,
}: {
    profile: GitHubProfile;
    analysis: ProfileAnalysis;
    roast: RoastResult;
    intensity: 'mild' | 'medium' | 'savage';
    onIntensityChange: (i: 'mild' | 'medium' | 'savage') => void;
    onRegenerate: () => void;
    loading: boolean;
}) {
    return (
        <div className="space-y-4">
            {/* Profile Header */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-4 mb-6">
                    <img
                        src={profile.avatarUrl}
                        alt={profile.login}
                        className="w-16 h-16 rounded-full border border-gray-200"
                    />
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">@{profile.login}</h2>
                        {profile.name && <p className="text-gray-500">{profile.name}</p>}
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-4 text-center border-t border-gray-100 pt-4">
                    <Stat label="Repos" value={analysis.totalRepos} />
                    <Stat label="Stars" value={analysis.totalStars} />
                    <Stat label="Followers" value={profile.followers} />
                    <Stat label="Years" value={analysis.accountAge.years} />
                </div>
            </div>

            {/* Roast Card */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Score Header */}
                <div className="bg-gray-900 text-white p-4 text-center flex flex-row items-center justify-between">
                    <div className="text-3xl font-bold">{roast.score}/100</div>
                    <div className="text-gray-400 text-xs uppercase tracking-wider">Developer Score</div>
                </div>

                <div className="p-4 space-y-4">
                    {/* Headline */}
                    <div className="text-center border-b border-gray-100 pb-4">
                        <p className="text-lg font-semibold text-gray-900">{roast.headline}</p>
                    </div>

                    {/* Verdict */}
                    <div className="text-center text-gray-600">
                        {roast.verdict}
                    </div>

                    {/* Roast Lines */}
                    <div className="space-y-3">
                        {roast.roastLines.map((line, i) => (
                            <div key={i} className="flex items-start gap-3 text-sm">
                                <span className="text-gray-400 font-mono">{String(i + 1).padStart(2, '0')}</span>
                                <span className="text-gray-700">{line}</span>
                            </div>
                        ))}
                    </div>

                    {/* Improvement */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Genuine Advice</p>
                        <p className="text-sm text-gray-700">{roast.improvement}</p>
                    </div>
                </div>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-lg">
                {(['mild', 'medium', 'savage'] as const).map(i => (
                    <button
                        key={i}
                        onClick={() => onIntensityChange(i)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${intensity === i
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {i}
                    </button>
                ))}
            </div>

            <button
                onClick={onRegenerate}
                disabled={loading}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
                {loading ? 'Generating...' : 'Regenerate'}
            </button>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div>
            <div className="text-xl font-bold text-gray-900">{formatNumber(value)}</div>
            <div className="text-xs text-gray-500">{label}</div>
        </div>
    );
}

// Utilities
function parseResult(result: any): any {
    if (!result) return null;
    if (result.result && typeof result.result === 'string') {
        try { return JSON.parse(result.result); } catch { /* fall through */ }
    }
    if (result.content?.[0]?.text) {
        try { return JSON.parse(result.content[0].text); } catch { /* fall through */ }
    }
    return result;
}

function formatNumber(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

export default RoastDashboard;
