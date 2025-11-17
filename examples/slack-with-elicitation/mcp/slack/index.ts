import { Tool } from "@leanmcp/core";
import { Elicitation, ElicitationFormBuilder, validation } from "@leanmcp/elicitation";
import { WebClient } from "@slack/web-api";

/**
 * Input types
 */
interface CreateChannelInput {
  channelName?: string;
  isPrivate?: boolean;
  description?: string;
}

interface SendMessageInput {
  channelId?: string;
  message: string;
  threadTs?: string;
}

interface DeployAppInput {
  environment?: string;
  replicas?: number;
  autoScale?: boolean;
}

/**
 * Slack Service with Elicitation Examples
 * Demonstrates various elicitation patterns and strategies
 */
export class SlackService {
  private client: WebClient | null;
  private isSimulated: boolean;

  constructor() {
    const token = process.env.SLACK_BOT_TOKEN;
    this.isSimulated = !token || token === 'simulated-token';
    
    if (this.isSimulated) {
      console.log('Running in SIMULATED mode - no real Slack API calls will be made');
      this.client = null;
    } else {
      console.log('Running with real Slack token');
      this.client = new WebClient(token);
    }
  }

  /**
   * Example 1: Simple form elicitation
   * All fields are collected at once
   */
  @Tool({ description: "Create a new Slack channel" })
  @Elicitation({
    title: "Create Slack Channel",
    description: "Please provide the channel details",
    fields: [
      {
        name: "channelName",
        label: "Channel Name",
        type: "text",
        required: true,
        placeholder: "e.g., team-announcements",
        validation: {
          pattern: "^[a-z0-9-]+$",
          errorMessage: "Channel name must be lowercase alphanumeric with hyphens only"
        }
      },
      {
        name: "isPrivate",
        label: "Private Channel",
        type: "boolean",
        defaultValue: false,
        helpText: "Private channels are only visible to invited members"
      },
      {
        name: "description",
        label: "Channel Description",
        type: "textarea",
        required: false,
        placeholder: "What is this channel for?"
      }
    ]
  })
  async createChannel(args: CreateChannelInput) {
    
    // Check if using simulated mode
    if (this.isSimulated || this.client === null) {
      // Mock response for demo
      return {
        success: true,
        channelId: `C${Date.now()}`,
        channelName: args.channelName,
        message: `[SIMULATED] Channel ${args.channelName} created successfully! (Set SLACK_BOT_TOKEN in .env for real Slack integration)`
      };
    }

    // Real Slack API call
    const result = await this.client.conversations.create({
      name: args.channelName!,
      is_private: args.isPrivate
    });

    return {
      success: true,
      channelId: result.channel?.id,
      channelName: result.channel?.name,
      message: `Channel ${args.channelName} created successfully!`
    };
  }

  /**
   * Example 2: Conditional elicitation
   * Only asks for channelId if not provided
   */
  @Tool({ description: "Send a message to a Slack channel" })
  @Elicitation({
    condition: (args) => !args.channelId,
    title: "Select Channel",
    description: "Which channel would you like to send the message to?",
    fields: [
      {
        name: "channelId",
        label: "Channel",
        type: "select",
        required: true,
        options: [
          { label: "#general", value: "C12345" },
          { label: "#random", value: "C67890" },
          { label: "#announcements", value: "C11111" }
        ]
      }
    ]
  })
  async sendMessage(args: SendMessageInput) {
    // Check if using simulated mode
    if (this.isSimulated) {
      // Mock response for demo
      return {
        success: true,
        messageTs: `${Date.now()}.000000`,
        message: `[SIMULATED] Message sent to channel ${args.channelId}! (Set SLACK_BOT_TOKEN in .env for real Slack integration)`
      };
    }

    // Real Slack API call
    const result = await this.client!.chat.postMessage({
      channel: args.channelId!,
      text: args.message,
      thread_ts: args.threadTs
    });

    return {
      success: true,
      messageTs: result.ts,
      message: "Message sent successfully!"
    };
  }

  /**
   * Example 3: Fluent builder API
   * More programmatic way to define elicitation
   */
  @Tool({ description: "List Slack channels" })
  @Elicitation({
    builder: (): any => new ElicitationFormBuilder()
      .title("Channel Filters")
      .description("Filter the channels you want to see")
      .addBooleanField("excludeArchived", "Exclude Archived", { 
        defaultValue: true 
      })
      .addSelectField("types", "Channel Types", [
        { label: "Public Channels", value: "public_channel" },
        { label: "Private Channels", value: "private_channel" },
        { label: "Direct Messages", value: "im" }
      ], { 
        required: true,
        defaultValue: "public_channel"
      })
      .addNumberField("limit", "Maximum Results", {
        defaultValue: 100,
        validation: validation()
          .min(1)
          .max(1000)
          .errorMessage("Limit must be between 1 and 1000")
          .build()
      })
      .build()
  })
  async listChannels(args: any) {
    // Check if using simulated mode
    if (this.isSimulated) {
      // Mock response for demo
      return {
        channels: [
          { id: "C12345", name: "general", isPrivate: false, memberCount: 42 },
          { id: "C67890", name: "random", isPrivate: false, memberCount: 38 },
          { id: "C11111", name: "announcements", isPrivate: false, memberCount: 50 }
        ],
        message: "[SIMULATED] Showing mock channels (Set SLACK_BOT_TOKEN in .env for real Slack integration)"
      };
    }

    // Real Slack API call
    const result = await this.client!.conversations.list({
      exclude_archived: args.excludeArchived,
      types: args.types,
      limit: args.limit
    });

    return {
      channels: result.channels?.map(ch => ({
        id: ch.id,
        name: ch.name,
        isPrivate: ch.is_private,
        memberCount: ch.num_members
      }))
    };
  }

  /**
   * Example 4: Multi-step elicitation
   * Breaks input collection into multiple steps
   */
  @Tool({ description: "Deploy application to environment" })
  @Elicitation({
    strategy: "multi-step",
    builder: (): any => [
      {
        title: "Step 1: Select Environment",
        description: "Choose the deployment environment",
        fields: [
          {
            name: "environment",
            label: "Environment",
            type: "select",
            required: true,
            options: [
              { label: "Production", value: "prod" },
              { label: "Staging", value: "staging" },
              { label: "Development", value: "dev" }
            ]
          }
        ]
      },
      {
        title: "Step 2: Configuration",
        description: "Configure deployment settings",
        fields: [
          {
            name: "replicas",
            label: "Number of Replicas",
            type: "number",
            defaultValue: 3,
            validation: {
              min: 1,
              max: 10,
              errorMessage: "Replicas must be between 1 and 10"
            }
          },
          {
            name: "autoScale",
            label: "Enable Auto-scaling",
            type: "boolean",
            defaultValue: true,
            helpText: "Automatically scale based on load"
          }
        ],
        // Only show this step for production
        condition: (prev: any) => prev.environment === 'prod'
      }
    ]
  })
  async deployApp(args: DeployAppInput) {
    return {
      success: true,
      environment: args.environment,
      replicas: args.replicas || 1,
      autoScale: args.autoScale || false,
      message: `[SIMULATED] Deployed to ${args.environment} with ${args.replicas || 1} replicas`
    };
  }

  /**
   * Example 5: Complex validation
   * Shows custom validators and multiple validation rules
   */
  @Tool({ description: "Create user account" })
  @Elicitation({
    builder: (): any => new ElicitationFormBuilder()
      .title("User Registration")
      .description("Create a new user account")
      .addEmailField("email", "Email Address", {
        required: true,
        placeholder: "user@example.com"
      })
      .addTextField("username", "Username", {
        required: true,
        validation: validation()
          .minLength(3)
          .maxLength(20)
          .pattern("^[a-zA-Z0-9_]+$")
          .errorMessage("Username must be 3-20 characters, alphanumeric and underscores only")
          .build()
      })
      .addTextField("password", "Password", {
        required: true,
        validation: validation()
          .minLength(8)
          .customValidator((value) => {
            const hasUpper = /[A-Z]/.test(value);
            const hasLower = /[a-z]/.test(value);
            const hasNumber = /[0-9]/.test(value);
            if (!hasUpper || !hasLower || !hasNumber) {
              return "Password must contain uppercase, lowercase, and numbers";
            }
            return true;
          })
          .build()
      })
      .addSelectField("role", "Role", [
        { label: "Admin", value: "admin" },
        { label: "User", value: "user" },
        { label: "Guest", value: "guest" }
      ], {
        required: true,
        defaultValue: "user"
      })
      .build()
  })
  async createUser(args: any) {
    return {
      success: true,
      userId: `U${Date.now()}`,
      username: args.username,
      email: args.email,
      role: args.role,
      message: `[SIMULATED] User ${args.username} created successfully!`
    };
  }
}
