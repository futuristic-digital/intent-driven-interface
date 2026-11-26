import { type IDIChatMessage } from '@intent-driven-interface/backend/api-contracts';
import { type TextUIPart } from 'ai';

/**
 * Builds static seed messages for `useIDI`.
 *
 * Each entry becomes a single text part with a fresh ISO `metadata.timestamp`.
 *
 * @param messages Chronological seed rows (ids must be stable across reloads).
 */
export const defineInitialMessages = (
  messages: Array<{
    id: string;
    role: 'system' | 'user' | 'assistant';
    text: string;
  }>
): IDIChatMessage[] =>
  messages.map((message) => {
    const textPart: TextUIPart = { type: 'text', text: message.text };

    return {
      id: message.id,
      role: message.role,
      metadata: { timestamp: new Date().toISOString() },
      parts: [textPart],
    };
  });
