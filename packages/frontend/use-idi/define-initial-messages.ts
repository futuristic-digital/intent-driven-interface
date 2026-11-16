import { type TextUIPart } from 'ai';

import { type AiSdkMessage } from './ai-sdk-message.format.js';

/**
 * Builds static seed messages in the AI SDK wire format used by `useIDI`.
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
): AiSdkMessage[] =>
  messages.map((message) => {
    const textPart: TextUIPart = { type: 'text', text: message.text };

    return {
      id: message.id,
      role: message.role,
      metadata: { timestamp: new Date().toISOString() },
      parts: [textPart],
    };
  });
