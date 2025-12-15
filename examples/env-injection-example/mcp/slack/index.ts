import { Tool, SchemaConstraint } from "@leanmcp/core";
import { Authenticated } from "@leanmcp/auth";
import { RequireEnv, getEnv, getAllEnv } from "@leanmcp/env-injection";
import { authProvider, projectId } from "../config.js";

/**
 * Input for sending a Slack message
 */
class SlackMessageInput {
    @SchemaConstraint({
        description: 'Message to send to Slack',
        minLength: 1
    })
    message!: string;

    @SchemaConstraint({
        description: 'Optional channel override (uses SLACK_CHANNEL env if not provided)'
    })
    channel?: string;
}

/**
 * Slack Integration Service
 * 
 * Demonstrates user-scoped environment variable injection.
 * Each user must have SLACK_TOKEN and SLACK_CHANNEL configured in their
 * LeanMCP dashboard secrets for this project.
 * 
 * The @Authenticated decorator with projectId automatically:
 * 1. Verifies the user's auth token
 * 2. Fetches their project-specific secrets
 * 3. Makes them available via getEnv()
 * 
 * The @RequireEnv decorator validates required secrets exist before 
 * the method executes, providing a clear error if any are missing.
 */
@Authenticated(authProvider, { projectId })
export class SlackService {

    /**
     * Send a message to Slack
     * 
     * Requires user to have SLACK_TOKEN and SLACK_CHANNEL configured.
     * These are fetched from the user's secrets, not global env vars.
     */
    @Tool({
        description: 'Send a message to Slack using your personal Slack token',
        inputClass: SlackMessageInput
    })
    @RequireEnv(["SLACK_TOKEN", "SLACK_CHANNEL"])
    async sendSlackMessage(args: SlackMessageInput): Promise<{
        success: boolean;
        channel: string;
        message: string;
        timestamp: string;
    }> {
        // getEnv() returns THIS USER's secret value, not a global
        const token = getEnv("SLACK_TOKEN")!;
        const channel = args.channel || getEnv("SLACK_CHANNEL")!;

        // In a real implementation, you would call the Slack API here
        console.log(`[Slack] Sending to ${channel}: ${args.message}`);
        console.log(`[Slack] Using token: ${token.substring(0, 10)}...`);

        // Simulate Slack API call
        return {
            success: true,
            channel,
            message: args.message,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * List all configured environment variables
     * 
     * This tool shows what secrets are available for the current user.
     * Useful for debugging.
     */
    @Tool({
        description: 'List all environment variables available to you (redacted)'
    })
    async listEnvVars(): Promise<{
        count: number;
        keys: string[];
        user: { uid: string; email: string };
    }> {
        const env = getAllEnv();
        const keys = Object.keys(env);

        return {
            count: keys.length,
            keys,
            user: {
                uid: authUser.uid,
                email: authUser.email
            }
        };
    }

    /**
     * Get a specific environment variable value
     */
    @Tool({
        description: 'Get the value of a specific environment variable'
    })
    async getEnvVar(args: { key: string }): Promise<{
        key: string;
        value: string | null;
        exists: boolean;
    }> {
        const value = getEnv(args.key);
        return {
            key: args.key,
            value: value ? `${value.substring(0, 5)}...` : null, // Redacted
            exists: !!value
        };
    }
}
