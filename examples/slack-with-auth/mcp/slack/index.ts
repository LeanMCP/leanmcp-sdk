import { Tool, Prompt, Resource, SchemaConstraint, Optional } from "@leanmcp/core";
import { Authenticated } from "@leanmcp/auth";
import { authProvider } from "../config.js";

// ============================================================================
// Input/Output Types
// ============================================================================

class SendMessageInput {
  @SchemaConstraint({
    description: 'Slack channel ID or name (e.g., #general, C1234567890)',
    minLength: 1
  })
  channel!: string;

  @SchemaConstraint({
    description: 'Message text to send',
    minLength: 1
  })
  text!: string;

  @Optional()
  @SchemaConstraint({
    description: 'Thread timestamp to reply to (for threaded messages)'
  })
  threadTs?: string;
}

class SendMessageOutput {
  success!: boolean;
  channel!: string;
  timestamp!: string;
  message!: string;
}

class GetChannelHistoryInput {
  @SchemaConstraint({
    description: 'Slack channel ID',
    minLength: 1
  })
  channel!: string;

  @Optional()
  @SchemaConstraint({
    description: 'Maximum number of messages to retrieve',
    minimum: 1,
    maximum: 100,
    default: 10
  })
  limit?: number;
}

class GetChannelHistoryOutput {
  channel!: string;
  messages!: Array<{
    user: string;
    text: string;
    timestamp: string;
    threadTs?: string;
  }>;
}

class CreateChannelInput {
  @SchemaConstraint({
    description: 'Channel name (without #)',
    minLength: 1,
    pattern: '^[a-z0-9-_]+$'
  })
  name!: string;

  @Optional()
  @SchemaConstraint({
    description: 'Channel description'
  })
  description?: string;

  @Optional()
  @SchemaConstraint({
    description: 'Whether the channel should be private',
    default: false
  })
  isPrivate?: boolean;
}

class CreateChannelOutput {
  success!: boolean;
  channelId!: string;
  channelName!: string;
}

class SearchMessagesInput {
  @SchemaConstraint({
    description: 'Search query',
    minLength: 1
  })
  query!: string;

  @Optional()
  @SchemaConstraint({
    description: 'Maximum number of results',
    minimum: 1,
    maximum: 100,
    default: 20
  })
  count?: number;
}

class SearchMessagesOutput {
  total!: number;
  matches!: Array<{
    channel: string;
    user: string;
    text: string;
    timestamp: string;
    permalink: string;
  }>;
}

class SetUserStatusInput {
  @SchemaConstraint({
    description: 'Status text',
    maxLength: 100
  })
  statusText!: string;

  @SchemaConstraint({
    description: 'Status emoji (e.g., :coffee:, :calendar:)',
    pattern: '^:[a-z0-9_+-]+:$'
  })
  statusEmoji!: string;

  @Optional()
  @SchemaConstraint({
    description: 'Unix timestamp when status expires (0 for no expiration)',
    minimum: 0
  })
  statusExpiration?: number;
}

class AddReactionInput {
  @SchemaConstraint({
    description: 'Channel ID where the message is',
    minLength: 1
  })
  channel!: string;

  @SchemaConstraint({
    description: 'Message timestamp',
    minLength: 1
  })
  timestamp!: string;

  @SchemaConstraint({
    description: 'Emoji name without colons (e.g., thumbsup, heart)',
    minLength: 1
  })
  reaction!: string;
}

// Empty input class for resources that don't need arguments
// Authentication is handled via _meta
class AuthenticatedResourceInput {}

class ComposeMessagePromptInput {
  @SchemaConstraint({
    description: 'Purpose of the message'
  })
  purpose!: string;

  @Optional()
  @SchemaConstraint({
    description: 'Tone of the message (e.g., professional, casual, formal)'
  })
  tone?: string;

  @Optional()
  @SchemaConstraint({
    description: 'Additional context for the message'
  })
  context?: string;
}

class ChannelDescriptionPromptInput {
  @SchemaConstraint({
    description: 'Name of the channel'
  })
  channelName!: string;

  @SchemaConstraint({
    description: 'Purpose of the channel'
  })
  channelPurpose!: string;
}

/**
 * Slack Service
 * 
 * Comprehensive Slack integration with authentication.
 * Most tools require authentication via @Authenticated decorator.
 * 
 * Authentication:
 * - All protected methods require authentication via _meta field in MCP requests
 * - Token should be passed in _meta.authorization.token (MCP standard)
 * - Example request format:
 *   {
 *     "method": "tools/call",
 *     "params": {
 *       "name": "sendMessage",
 *       "arguments": { "channel": "#general", "text": "Hello" },
 *       "_meta": {
 *         "authorization": {
 *           "type": "bearer",
 *           "token": "your-jwt-token"
 *         }
 *       }
 *     }
 *   }
 * 
 * Public tools (no auth required):
 * - getServiceInfo: Get information about the Slack service
 * 
 * Protected tools (auth required):
 * - sendMessage: Send messages to channels
 * - getChannelHistory: Retrieve channel message history
 * - createChannel: Create new channels
 * - searchMessages: Search across workspace messages
 * - setUserStatus: Update user status
 * - addReaction: Add emoji reactions to messages
 * - listChannels: List all channels (resource)
 * - getWorkspaceInfo: Get workspace information (resource)
 * - composeMessagePrompt: Generate message templates (prompt)
 * - channelDescriptionPrompt: Generate channel descriptions (prompt)
 * 
 * Note: Authentication is enforced via the class-level @Authenticated decorator,
 * which automatically validates the token from _meta.authorization.token.
 * Public methods like getServiceInfo are in the separate PublicSlackService class.
 */

@Authenticated(authProvider)
export class SlackService {
  private slackToken: string;

  constructor() {
    // Initialize from environment variables
    this.slackToken = process.env.SLACK_BOT_TOKEN || 'simulated-token';
  }

  // ============================================================================
  // Tools
  // All tools are protected by the class-level @Authenticated decorator
  // ============================================================================

  /**
   * Send a message to a Slack channel
   * Authentication is automatically enforced by the class-level decorator
   */
  @Tool({ 
    description: 'Send a message to a Slack channel. Supports threaded replies.',
    inputClass: SendMessageInput
  })
  async sendMessage(args: SendMessageInput): Promise<SendMessageOutput> {    
    // Simulate Slack API call
    // In production, use @slack/web-api
    console.log(`Sending message to ${args.channel}: ${args.text}`);
    
    return {
      success: true,
      channel: args.channel,
      timestamp: Date.now().toString(),
      message: args.text
    };
  }

  /**
   * Get message history from a Slack channel
   * Authentication is automatically enforced by the class-level decorator
   */
  @Tool({ 
    description: 'Retrieve message history from a Slack channel. Returns recent messages with user info and timestamps.',
    inputClass: GetChannelHistoryInput
  })
  async getChannelHistory(args: GetChannelHistoryInput): Promise<GetChannelHistoryOutput> {
    // Simulate Slack API call
    console.log(`Fetching history for channel ${args.channel}`);
    
    return {
      channel: args.channel,
      messages: [
        {
          user: 'U1234567890',
          text: 'Hello team!',
          timestamp: '1699999999.123456'
        },
        {
          user: 'U0987654321',
          text: 'Hi there!',
          timestamp: '1699999998.123456'
        }
      ]
    };
  }

  /**
   * Create a new Slack channel
   * Authentication is automatically enforced by the class-level decorator
   */
  @Tool({ 
    description: 'Create a new public or private Slack channel. Returns the channel ID and name.',
    inputClass: CreateChannelInput
  })
  async createChannel(args: CreateChannelInput): Promise<CreateChannelOutput> {
    // Simulate Slack API call
    console.log(`Creating ${args.isPrivate ? 'private' : 'public'} channel: ${args.name}`);
    
    return {
      success: true,
      channelId: `C${Date.now()}`,
      channelName: args.name
    };
  }

  /**
   * Search for messages across the workspace
   * Authentication is automatically enforced by the class-level decorator
   */
  @Tool({ 
    description: 'Search for messages across all accessible Slack channels. Returns matching messages with context.',
    inputClass: SearchMessagesInput
  })
  async searchMessages(args: SearchMessagesInput): Promise<SearchMessagesOutput> {
    // Simulate Slack API call
    console.log(`Searching for: ${args.query}`);
    
    return {
      total: 2,
      matches: [
        {
          channel: 'C1234567890',
          user: 'U1234567890',
          text: `Message containing ${args.query}`,
          timestamp: '1699999999.123456',
          permalink: 'https://workspace.slack.com/archives/C1234567890/p1699999999123456'
        }
      ]
    };
  }

  /**
   * Set the authenticated user's status
   * Authentication is automatically enforced by the class-level decorator
   */
  @Tool({ 
    description: 'Update your Slack status with custom text and emoji. Optionally set an expiration time.',
    inputClass: SetUserStatusInput
  })
  async setUserStatus(args: SetUserStatusInput): Promise<{ success: boolean; status: string }> {
    // Simulate Slack API call
    console.log(`Setting status: ${args.statusEmoji} ${args.statusText}`);
    
    return {
      success: true,
      status: `${args.statusEmoji} ${args.statusText}`
    };
  }

  /**
   * Add an emoji reaction to a message
   * Authentication is automatically enforced by the class-level decorator
   */
  @Tool({ 
    description: 'Add an emoji reaction to a Slack message. Use emoji names without colons.',
    inputClass: AddReactionInput
  })
  async addReaction(args: AddReactionInput): Promise<{ success: boolean }> {
    // Simulate Slack API call
    console.log(`Adding reaction :${args.reaction}: to message ${args.timestamp} in ${args.channel}`);
    
    return {
      success: true
    };
  }

  // ============================================================================
  // Resources
  // All resources are protected by the class-level @Authenticated decorator
  // ============================================================================

  /**
   * List all channels in the workspace
   * Authentication is automatically enforced by the class-level decorator
   */
  @Resource({ 
    description: 'Get a list of all channels in the Slack workspace',
    mimeType: 'application/json',
    inputClass: AuthenticatedResourceInput
  })
  async listChannels(args: AuthenticatedResourceInput) {
    // Simulate Slack API call
    return {
      channels: [
        {
          id: 'C1234567890',
          name: 'general',
          isPrivate: false,
          memberCount: 150
        },
        {
          id: 'C0987654321',
          name: 'random',
          isPrivate: false,
          memberCount: 120
        },
        {
          id: 'C1111111111',
          name: 'engineering',
          isPrivate: true,
          memberCount: 25
        }
      ]
    };
  }

  /**
   * Get workspace information
   * Authentication is automatically enforced by the class-level decorator
   */
  @Resource({ 
    description: 'Get information about the Slack workspace',
    mimeType: 'application/json',
    inputClass: AuthenticatedResourceInput
  })
  async getWorkspaceInfo(args: AuthenticatedResourceInput) {
    // Simulate Slack API call
    return {
      id: 'T1234567890',
      name: 'My Workspace',
      domain: 'myworkspace',
      emailDomain: 'company.com',
      icon: {
        image_default: true
      }
    };
  }

  // ============================================================================
  // Prompts
  // All prompts are protected by the class-level @Authenticated decorator
  // ============================================================================

  /**
   * Generate a prompt for composing a professional Slack message
   * Authentication is automatically enforced by the class-level decorator
   */
  @Prompt({ 
    description: 'Generate a professional Slack message template based on context and purpose',
    inputClass: ComposeMessagePromptInput
  })
  async composeMessagePrompt(args: ComposeMessagePromptInput) {
    const tone = args.tone || 'professional';
    const context = args.context || '';
    
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Compose a ${tone} Slack message for the following purpose: ${args.purpose}${context ? `\n\nContext: ${context}` : ''}\n\nThe message should be clear, concise, and appropriate for a workplace communication platform.`
          }
        }
      ]
    };
  }

  /**
   * Generate a prompt for creating effective channel descriptions
   * Authentication is automatically enforced by the class-level decorator
   */
  @Prompt({ 
    description: 'Generate a clear and informative Slack channel description',
    inputClass: ChannelDescriptionPromptInput
  })
  async channelDescriptionPrompt(args: ChannelDescriptionPromptInput) {
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Create a concise and clear channel description for a Slack channel named "${args.channelName}" with the following purpose: ${args.channelPurpose}\n\nThe description should be 1-2 sentences and help users understand what the channel is for.`
          }
        }
      ]
    };
  }
}

/**
 * Public Slack Service (No Authentication Required)
 * 
 * Contains tools that don't require authentication, such as
 * getting service information.
 */
export class PublicSlackService {
  /**
   * Get information about the Slack service
   * No authentication required
   */
  @Tool({ 
    description: 'Get information about the Slack MCP service, including available features and authentication requirements' 
  })
  async getServiceInfo(): Promise<{
    name: string;
    version: string;
    description: string;
    authRequired: boolean;
    features: string[];
  }> {
    return {
      name: 'Slack MCP Service',
      version: '1.0.0',
      description: 'Comprehensive Slack integration with authentication support',
      authRequired: true,
      features: [
        'Send messages to channels',
        'Retrieve channel history',
        'Create new channels',
        'Search messages across workspace',
        'Update user status',
        'Add emoji reactions',
        'List all channels',
        'Get workspace information',
        'Generate message templates',
        'Create channel descriptions'
      ]
    };
  }
}
