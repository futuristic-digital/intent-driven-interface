import { type IDIChatMessage } from '@intent-driven-interface/backend/api-contracts';
import { type ToolUIPart } from 'ai';

import { type ComponentMap } from '../component-map/define-component-map.js';
import { type NotifyMessageUpdate } from '../transport/use-message-updates.js';
import { finalizeDisplacedComponents } from './component-displacement.js';
import {
  mapComponentMessages,
  type SetMessages,
} from './component-message-mutation.js';
import {
  finalizeComponentPart,
  matchesComponentToolCall,
} from './component-part.js';

/** Reads the latest SDK snapshot, including updates made earlier in the same event. */
export const findComponentPart = (
  setMessages: SetMessages,
  toolCallId: string
): ToolUIPart | undefined => {
  let result: ToolUIPart | undefined;
  setMessages((messages) => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (matchesComponentToolCall(part, toolCallId)) result = part;
      }
    }
    return messages;
  });
  return result;
};

// Coordinate across callbacks rebuilt with a new notifier or component map.
const closingComponents = new WeakMap<SetMessages, Promise<boolean>>();

export const isClosingComponent = (setMessages: SetMessages): boolean =>
  closingComponents.has(setMessages);

export const getPendingComponentClosure = (setMessages: SetMessages) =>
  closingComponents.get(setMessages);

const replaceComponentPart = (
  setMessages: SetMessages,
  toolCallId: string,
  update: (part: ToolUIPart) => ToolUIPart,
  commit: boolean
): IDIChatMessage | undefined => {
  let changedMessage: IDIChatMessage | undefined;
  setMessages((messages) => {
    const { nextMessages, changedMessages } = mapComponentMessages(
      messages,
      (part) => (part.toolCallId === toolCallId ? update(part) : part)
    );
    changedMessage = changedMessages.at(-1);
    return commit ? nextMessages : messages;
  });
  return changedMessage;
};

/** Updates a draft locally and publishes its containing message. */
export const updateComponentPart = (
  setMessages: SetMessages,
  toolCallId: string,
  update: (part: ToolUIPart) => ToolUIPart,
  notifyMessageUpdate: NotifyMessageUpdate
): Promise<void> => {
  const changedMessage = replaceComponentPart(
    setMessages,
    toolCallId,
    update,
    true
  );
  return changedMessage
    ? notifyMessageUpdate(changedMessage)
    : Promise.resolve();
};

/** Leaves the live view and its draft untouched if the message update fails. */
export const commitComponentClosure = (
  setMessages: SetMessages,
  toolCallId: string,
  output: unknown,
  notifyMessageUpdate: NotifyMessageUpdate
): Promise<boolean> => {
  if (isClosingComponent(setMessages)) return Promise.resolve(false);
  const closure = Promise.resolve()
    .then(async () => {
      let finalizedPart: ToolUIPart | undefined;
      const message = replaceComponentPart(
        setMessages,
        toolCallId,
        (part) => {
          finalizedPart = finalizeComponentPart(part, output);
          return finalizedPart;
        },
        false
      );
      if (!message || !finalizedPart) return false;
      const closedPart = finalizedPart;
      await notifyMessageUpdate(message);
      return Boolean(
        replaceComponentPart(setMessages, toolCallId, () => closedPart, true)
      );
    })
    .finally(() => {
      closingComponents.delete(setMessages);
    });
  closingComponents.set(setMessages, closure);
  return closure;
};

const closeComponents = (
  setMessages: SetMessages,
  notifyMessageUpdate: NotifyMessageUpdate,
  componentMap: ComponentMap,
  keepLatest: boolean
): Promise<void> => {
  let changedMessages: IDIChatMessage[] = [];
  setMessages((messages) => {
    const { nextMessages, changedMessages: displacedMessages } =
      finalizeDisplacedComponents(messages, componentMap, keepLatest);
    changedMessages = displacedMessages;
    return nextMessages;
  });
  return Promise.all(
    changedMessages.map((message) => notifyMessageUpdate(message))
  ).then(() => undefined);
};

/** Ends open invocations before a user message or a newly opened component. */
export const closeOpenComponents = (
  setMessages: SetMessages,
  notifyMessageUpdate: NotifyMessageUpdate,
  componentMap: ComponentMap
): Promise<void> =>
  closeComponents(setMessages, notifyMessageUpdate, componentMap, false);

/** On restore/stream completion, only the last chat part may remain live. */
export const closeInactiveComponents = (
  setMessages: SetMessages,
  notifyMessageUpdate: NotifyMessageUpdate,
  componentMap: ComponentMap
): Promise<void> =>
  closeComponents(setMessages, notifyMessageUpdate, componentMap, true);
