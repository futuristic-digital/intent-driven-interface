import { type UseChatHelpers } from '@ai-sdk/react';
import {
  type UIToolMetadata,
  uiToolMetadataSchema,
} from '@intent-driven-interface/backend/api-contracts';
import { type ToolUIPart } from 'ai';

import { type AiSdkMessage } from './ai-sdk-message.format.js';
import { saveMessage, type IDIBackend } from './save-message.js';
import { type ComponentMap } from '../component-map/define-component-map.js';

/** Reads only the supported IDI metadata from an SDK part. */
export const readToolMetadata = (part: {
  toolMetadata?: unknown;
}): UIToolMetadata => uiToolMetadataSchema.parse(part.toolMetadata ?? {});

/** Narrows SDK parts to registered component invocations. */
export const isComponentToolPart = (
  part: AiSdkMessage['parts'][number]
): part is ToolUIPart => part.type.startsWith('tool-') && 'toolCallId' in part;

/** Commits draft output once, preserving original input and the latest input state. */
export const finalizeComponentPart = (
  part: ToolUIPart,
  output: unknown = readToolMetadata(part).componentOutputState
): ToolUIPart => {
  const metadata = readToolMetadata(part);
  if (metadata.closedAt) return part;
  const { componentOutputState: _draft, ...retainedMetadata } = metadata;
  const closedAt = new Date().toISOString();
  // Keep provider call metadata needed for subsequent model turns, while SDK
  // output states can retain only approvals that were actually granted.
  const { approval, ...retainedPart } = part;
  return {
    ...retainedPart,
    state: 'output-available',
    input: part.input,
    output,
    errorText: undefined,
    ...(approval?.approved === true
      ? { approval: { ...approval, approved: approval.approved } }
      : {}),
    toolMetadata: {
      ...retainedMetadata,
      closedAt,
    },
  };
};

/** Reads the latest SDK snapshot, including updates made earlier in the same event. */
export const findComponentPart = (
  setMessages: UseChatHelpers<AiSdkMessage>['setMessages'],
  toolCallId: string
): ToolUIPart | undefined => {
  let result: ToolUIPart | undefined;
  setMessages((messages) => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (isComponentToolPart(part) && part.toolCallId === toolCallId)
          result = part;
      }
    }
    return messages;
  });
  return result;
};

/** Updates one invocation immutably and persists its containing message in order. */
export const updateComponentPart = (
  setMessages: UseChatHelpers<AiSdkMessage>['setMessages'],
  toolCallId: string,
  update: (part: ToolUIPart) => ToolUIPart,
  idiBackend: IDIBackend
): Promise<void> => {
  let changedMessage: AiSdkMessage | undefined;
  setMessages((messages) =>
    messages.map((message) => {
      let changed = false;
      const parts = message.parts.map((part) => {
        if (!isComponentToolPart(part) || part.toolCallId !== toolCallId)
          return part;
        const nextPart = update(part);
        changed ||= nextPart !== part;
        return nextPart;
      });
      if (!changed) return message;
      changedMessage = { ...message, parts };
      return changedMessage;
    })
  );
  return changedMessage
    ? saveMessage(idiBackend, changedMessage)
    : Promise.resolve();
};

/** Ends open invocations before a user message or a newly opened component. */
export const closeOpenComponents = (
  setMessages: UseChatHelpers<AiSdkMessage>['setMessages'],
  idiBackend: IDIBackend,
  componentMap: ComponentMap
): Promise<void> => {
  const changedMessages: AiSdkMessage[] = [];
  setMessages((messages) =>
    messages.map((message) => {
      let changed = false;
      const parts = message.parts.map((part) => {
        if (!isComponentToolPart(part) || part.state === 'input-streaming')
          return part;
        const component = componentMap[part.type.slice('tool-'.length)];
        if (!component) return part;
        const nextPart = finalizeComponentPart(part);
        changed ||= nextPart !== part;
        return nextPart;
      });
      if (!changed) return message;
      const nextMessage = { ...message, parts };
      changedMessages.push(nextMessage);
      return nextMessage;
    })
  );
  return Promise.all(
    changedMessages.map((message) => saveMessage(idiBackend, message))
  ).then(() => undefined);
};

/** On restore/stream completion, only the last chat part may remain live. */
export const closeInactiveComponents = (
  setMessages: UseChatHelpers<AiSdkMessage>['setMessages'],
  idiBackend: IDIBackend,
  componentMap: ComponentMap
): Promise<void> => {
  const changedMessages: AiSdkMessage[] = [];
  setMessages((messages) => {
    const lastMessage = messages.at(-1);
    const lastPart = lastMessage?.parts.at(-1);
    const nextMessages = messages.map((message) => {
      let changed = false;
      const parts = message.parts.map((part) => {
        if (!isComponentToolPart(part) || part.state === 'input-streaming')
          return part;
        if (part === lastPart) return part;
        const component = componentMap[part.type.slice('tool-'.length)];
        if (!component) return part;
        const nextPart = finalizeComponentPart(part);
        changed ||= part !== nextPart;
        return nextPart;
      });
      if (!changed) return message;
      const nextMessage = { ...message, parts };
      changedMessages.push(nextMessage);
      return nextMessage;
    });
    return changedMessages.length ? nextMessages : messages;
  });
  return Promise.all(
    changedMessages.map((message) => saveMessage(idiBackend, message))
  ).then(() => undefined);
};

/** Checks before reconciling: SDK setMessages emits even for an unchanged array. */
export const hasInactiveComponents = (
  messages: AiSdkMessage[],
  componentMap: ComponentMap
): boolean =>
  messages.some((message, messageIndex) =>
    message.parts.some(
      (part, partIndex) =>
        isComponentToolPart(part) &&
        part.type.slice('tool-'.length) in componentMap &&
        part.state !== 'input-streaming' &&
        !readToolMetadata(part).closedAt &&
        (messageIndex !== messages.length - 1 ||
          partIndex !== message.parts.length - 1)
    )
  );

/** Prevents delayed persistence from resuming an invocation displaced by a new action. */
export const isLatestComponent = (
  setMessages: UseChatHelpers<AiSdkMessage>['setMessages'],
  toolCallId: string
): boolean => {
  let isLatest = false;
  setMessages((messages) => {
    const lastPart = messages.at(-1)?.parts.at(-1);
    isLatest = Boolean(
      lastPart &&
      isComponentToolPart(lastPart) &&
      lastPart.toolCallId === toolCallId
    );
    return messages;
  });
  return isLatest;
};
