import { type UseChatHelpers } from '@ai-sdk/react';
import {
  type IDIChatMessage,
  hasStreamingParts,
} from '@intent-driven-interface/backend/api-contracts';
import { type ToolUIPart } from 'ai';

import { isComponentToolPart } from './component-part.js';

export type SetMessages = UseChatHelpers<IDIChatMessage>['setMessages'];

export const canMutateComponentMessage = (message: IDIChatMessage): boolean =>
  !hasStreamingParts(message);

/** Stages replacements and collects the full messages that need publishing. */
export const mapComponentMessages = (
  messages: IDIChatMessage[],
  updatePart: (part: ToolUIPart) => ToolUIPart
): { nextMessages: IDIChatMessage[]; changedMessages: IDIChatMessage[] } => {
  const changedMessages: IDIChatMessage[] = [];
  const nextMessages = messages.map((message) => {
    if (!canMutateComponentMessage(message)) return message;
    let changed = false;
    const parts = message.parts.map((part) => {
      if (!isComponentToolPart(part)) return part;
      const nextPart = updatePart(part);
      changed ||= nextPart !== part;
      return nextPart;
    });
    if (!changed) return message;
    const nextMessage = { ...message, parts };
    changedMessages.push(nextMessage);
    return nextMessage;
  });
  return {
    nextMessages: changedMessages.length ? nextMessages : messages,
    changedMessages,
  };
};
