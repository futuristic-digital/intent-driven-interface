import { type UIMessage } from 'ai';

/** Default number of recent UI messages kept in agent requests. */
export const AGENT_CONTEXT_MAX_MESSAGES = 40;

type MessageWithRole = Pick<UIMessage, 'role'>;

/**
 * Returns the most recent chat messages that should be sent to the agent.
 *
 * UI state can still hold the full thread; this helper only limits what the
 * model sees. Truncation keeps whole messages (never splits parts) by taking
 * the last {@link AGENT_CONTEXT_MAX_MESSAGES} entries.
 *
 * @param messages Full thread in chronological order.
 * @returns Either the same array, or a suffix of it when over the limit.
 */
export const trimMessagesForAgent = <M extends MessageWithRole>(
  messages: M[]
): M[] => {
  if (messages.length <= AGENT_CONTEXT_MAX_MESSAGES) {
    return messages;
  }

  return messages.slice(-AGENT_CONTEXT_MAX_MESSAGES);
};
