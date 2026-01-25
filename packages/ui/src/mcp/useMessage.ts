/**
 * useMessage - Hook for sending messages to the host chat
 *
 * Enables MCP Apps to communicate back to the host's chat interface.
 * This is useful for user-initiated actions that should appear in the conversation.
 *
 * @example Basic usage
 * ```tsx
 * function FeedbackButton() {
 *   const { send, sending } = useMessage();
 *
 *   return (
 *     <Button
 *       onClick={() => send('User clicked the feedback button')}
 *       disabled={sending}
 *     >
 *       Send Feedback
 *     </Button>
 *   );
 * }
 * ```
 *
 * @example Request a tool call
 * ```tsx
 * function RefreshAction() {
 *   const { requestTool, sending } = useMessage();
 *
 *   return (
 *     <Button
 *       onClick={() => requestTool('refresh-all-data')}
 *       disabled={sending}
 *     >
 *       Refresh All
 *     </Button>
 *   );
 * }
 * ```
 */
import { useState, useCallback } from 'react';
import { useMcpApp } from './AppProvider';
import type { ContentBlock } from '@modelcontextprotocol/sdk/types.js';

/**
 * Result returned by useMessage hook
 */
export interface UseMessageReturn {
  /** Send a text message to the host chat */
  send: (text: string) => Promise<void>;
  /** Send structured content blocks */
  sendContent: (content: ContentBlock[]) => Promise<void>;
  /** Request the agent to call a specific tool */
  requestTool: (toolName: string, args?: Record<string, unknown>) => Promise<void>;
  /** Whether currently sending a message */
  sending: boolean;
  /** Last error if any */
  error: Error | null;
}

/**
 * Hook for sending messages to the MCP host chat
 */
export function useMessage(): UseMessageReturn {
  const { sendMessage: appSendMessage, isConnected } = useMcpApp();

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Send a simple text message
   */
  const send = useCallback(
    async (text: string): Promise<void> => {
      if (!isConnected) {
        console.warn('[useMessage] Not connected to host');
        return;
      }

      setSending(true);
      setError(null);

      try {
        await appSendMessage(text);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setSending(false);
      }
    },
    [appSendMessage, isConnected]
  );

  /**
   * Send structured content blocks
   */
  const sendContent = useCallback(
    async (content: ContentBlock[]): Promise<void> => {
      if (!isConnected) {
        console.warn('[useMessage] Not connected to host');
        return;
      }

      setSending(true);
      setError(null);

      try {
        // For now, convert content blocks to text
        // The AppProvider.sendMessage only accepts text currently
        const textContent = content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');

        await appSendMessage(textContent);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setSending(false);
      }
    },
    [appSendMessage, isConnected]
  );

  /**
   * Request the agent to call a specific tool
   * Sends a message like "Please call the X tool with args Y"
   */
  const requestTool = useCallback(
    async (toolName: string, args?: Record<string, unknown>): Promise<void> => {
      let message = `Please call the "${toolName}" tool`;

      if (args && Object.keys(args).length > 0) {
        message += ` with arguments: ${JSON.stringify(args)}`;
      }

      await send(message);
    },
    [send]
  );

  return {
    send,
    sendContent,
    requestTool,
    sending,
    error,
  };
}
