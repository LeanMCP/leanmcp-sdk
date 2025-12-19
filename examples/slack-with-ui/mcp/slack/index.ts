import {
  Tool,
  Resource,
  SchemaConstraint,
  Optional,
} from '@leanmcp/core';
import { UIApp } from '@leanmcp/ui';
import { WebClient } from '@slack/web-api';

class SendMessageInput {
  @SchemaConstraint({ 
    description: 'Channel ID or name (e.g., C1234567890 or #general)',
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
    description: 'Thread timestamp to reply to',
  })
  thread_ts?: string;
}

class GetMessagesInput {
  @SchemaConstraint({ 
    description: 'Channel ID (e.g., C1234567890)',
    minLength: 1 
  })
  channel!: string;

  @Optional()
  @SchemaConstraint({ 
    description: 'Number of messages to retrieve',
    minimum: 1,
    maximum: 100,
    default: 20
  })
  limit?: number;
}

class SearchMessagesInput {
  @SchemaConstraint({ 
    description: 'Search query',
    minLength: 1 
  })
  query!: string;

  @Optional()
  @SchemaConstraint({ 
    description: 'Number of results to return',
    minimum: 1,
    maximum: 100,
    default: 20
  })
  count?: number;
}

class GetUserInfoInput {
  @SchemaConstraint({ 
    description: 'User ID (e.g., U1234567890)',
    minLength: 1 
  })
  user!: string;
}

export class SlackService {
  private client: WebClient;

  constructor() {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      throw new Error('SLACK_BOT_TOKEN environment variable is required');
    }
    this.client = new WebClient(token);
  }

  @Tool({
    description: 'List all Slack channels in the workspace',
  })
  @UIApp({ component: './ChannelsList' })
  async listChannels() {
    try {
      const result = await this.client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 200,
      });

      const channels = result.channels?.map(ch => ({
        id: ch.id,
        name: ch.name,
        is_private: ch.is_private,
        is_member: ch.is_member,
        num_members: ch.num_members,
        topic: ch.topic?.value || '',
        purpose: ch.purpose?.value || '',
      })) || [];

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ channels }, null, 2),
        }],
      };
    } catch (error: any) {
      throw new Error(`Failed to list channels: ${error.message}`);
    }
  }

  @Tool({
    description: 'Send a message to a Slack channel',
    inputClass: SendMessageInput,
  })
  async sendMessage(input: SendMessageInput) {
    try {
      const result = await this.client.chat.postMessage({
        channel: input.channel,
        text: input.text,
        thread_ts: input.thread_ts,
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            channel: result.channel,
            ts: result.ts,
            message: input.text,
          }, null, 2),
        }],
      };
    } catch (error: any) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  @Tool({
    description: 'Get recent messages from a Slack channel',
    inputClass: GetMessagesInput,
  })
  @UIApp({ component: './MessageViewer' })
  async getMessages(input: GetMessagesInput) {
    try {
      const result = await this.client.conversations.history({
        channel: input.channel,
        limit: input.limit || 20,
      });

      const messages = await Promise.all(
        (result.messages || []).map(async msg => {
          let userName = 'Unknown';
          if (msg.user) {
            try {
              const userInfo = await this.client.users.info({ user: msg.user });
              userName = userInfo.user?.real_name || userInfo.user?.name || msg.user;
            } catch {
              userName = msg.user;
            }
          }

          return {
            ts: msg.ts,
            user: userName,
            user_id: msg.user,
            text: msg.text,
            thread_ts: msg.thread_ts,
            reply_count: msg.reply_count || 0,
          };
        })
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            channel: input.channel,
            messages: messages.reverse(),
          }, null, 2),
        }],
      };
    } catch (error: any) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }
  }

  @Tool({
    description: 'Search for messages across all channels',
    inputClass: SearchMessagesInput,
  })
  async searchMessages(input: SearchMessagesInput) {
    try {
      const result = await this.client.search.messages({
        query: input.query,
        count: input.count || 20,
      });

      const messages = result.messages?.matches?.map(msg => ({
        text: msg.text,
        user: msg.username,
        channel: msg.channel?.name,
        ts: msg.ts,
        permalink: msg.permalink,
      })) || [];

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            query: input.query,
            total: result.messages?.total || 0,
            messages,
          }, null, 2),
        }],
      };
    } catch (error: any) {
      throw new Error(`Failed to search messages: ${error.message}`);
    }
  }

  @Tool({
    description: 'Get information about a Slack user',
    inputClass: GetUserInfoInput,
  })
  async getUserInfo(input: GetUserInfoInput) {
    try {
      const result = await this.client.users.info({
        user: input.user,
      });

      const user = result.user;
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: user?.id,
            name: user?.name,
            real_name: user?.real_name,
            display_name: user?.profile?.display_name,
            email: user?.profile?.email,
            title: user?.profile?.title,
            phone: user?.profile?.phone,
            is_bot: user?.is_bot,
            is_admin: user?.is_admin,
            is_owner: user?.is_owner,
            timezone: user?.tz,
          }, null, 2),
        }],
      };
    } catch (error: any) {
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  @Resource({ 
    description: 'Get Slack workspace information',
  })
  async workspaceInfo() {
    try {
      const result = await this.client.team.info();
      const team = result.team;

      return {
        contents: [{
          uri: 'slack://workspace/info',
          mimeType: 'application/json',
          text: JSON.stringify({
            id: team?.id,
            name: team?.name,
            domain: team?.domain,
            email_domain: team?.email_domain,
          }, null, 2),
        }],
      };
    } catch (error: any) {
      throw new Error(`Failed to get workspace info: ${error.message}`);
    }
  }
}