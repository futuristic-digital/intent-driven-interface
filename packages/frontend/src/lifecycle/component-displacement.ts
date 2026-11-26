import { type IDIChatMessage } from '@intent-driven-interface/backend/api-contracts';
import { type ToolUIPart } from 'ai';

import {
  isComponentId,
  type ComponentMap,
} from '../component-map/define-component-map.js';
import {
  canMutateComponentMessage,
  mapComponentMessages,
  type SetMessages,
} from './component-message-mutation.js';
import {
  finalizeComponentPart,
  getComponentIdFromToolType,
  isComponentToolPart,
  matchesComponentToolCall,
  readToolMetadata,
} from './component-part.js';

const getLatestPart = (messages: IDIChatMessage[]) =>
  messages.at(-1)?.parts.at(-1);

const isRegisteredComponentPart = (
  part: ToolUIPart,
  componentMap: ComponentMap
) => isComponentId(componentMap, getComponentIdFromToolType(part.type));

export const finalizeDisplacedComponents = (
  messages: IDIChatMessage[],
  componentMap: ComponentMap,
  keepLatest: boolean
) => {
  const lastPart = keepLatest ? getLatestPart(messages) : undefined;
  return mapComponentMessages(messages, (part) =>
    part !== lastPart && isRegisteredComponentPart(part, componentMap)
      ? finalizeComponentPart(part)
      : part
  );
};

/** Checks before reconciling: SDK setMessages emits even for an unchanged array. */
export const hasInactiveComponents = (
  messages: IDIChatMessage[],
  componentMap: ComponentMap
): boolean =>
  messages.some(
    (message, messageIndex) =>
      canMutateComponentMessage(message) &&
      message.parts.some(
        (part, partIndex) =>
          isComponentToolPart(part) &&
          isRegisteredComponentPart(part, componentMap) &&
          !readToolMetadata(part).closedAt &&
          (messageIndex !== messages.length - 1 ||
            partIndex !== message.parts.length - 1)
      )
  );

/** Prevents a delayed update from resuming an invocation displaced by a new action. */
export const isLatestComponent = (
  setMessages: SetMessages,
  toolCallId: string
): boolean => {
  let isLatest = false;
  setMessages((messages) => {
    isLatest = matchesComponentToolCall(getLatestPart(messages), toolCallId);
    return messages;
  });
  return isLatest;
};
