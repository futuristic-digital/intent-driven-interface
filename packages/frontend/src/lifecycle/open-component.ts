import {
  type IDIChatMessage,
  type UIToolMetadata,
} from '@intent-driven-interface/backend/api-contracts';

import {
  isComponentId,
  type ComponentMap,
} from '../component-map/define-component-map.js';
import { type NotifyMessageUpdate } from '../transport/use-message-updates.js';
import { closeOpenComponents } from './component-lifecycle.js';
import { type SetMessages } from './component-message-mutation.js';
import {
  createComponentToolPart,
  generateInternalId,
} from './component-part.js';

export type AppendComponentMessage = (
  componentId: string,
  componentInput: { initial: unknown; override?: unknown },
  resumeCaller?: UIToolMetadata['resumeCaller']
) => void;

/**
 * Fresh calls supply only initial input; resuming a caller also preserves its override.
 */
export const createAppendComponentMessage =
  (
    setMessages: SetMessages,
    componentMap: ComponentMap,
    notifyMessageUpdate: NotifyMessageUpdate,
    canInteract: () => boolean
  ): AppendComponentMessage =>
  (componentId, componentInput, resumeCaller) => {
    if (!canInteract()) return;
    if (!isComponentId(componentMap, componentId)) {
      console.error(
        `component '${componentId}' not found in component map`,
        `component map keys: ${Object.keys(componentMap).join(', ')}`
      );
      return;
    }

    const inputSchema = componentMap[componentId]?.inputSchema;
    const parsedInput = inputSchema?.safeParse(componentInput.initial);
    if (!parsedInput?.success) {
      console.error(
        'component input schema validation failed',
        componentId,
        parsedInput?.error
      );
      return;
    }

    const inputOverride =
      componentInput.override === undefined
        ? undefined
        : inputSchema?.parse(componentInput.override);
    const newPart = createComponentToolPart(
      componentId,
      parsedInput.data,
      inputOverride,
      resumeCaller
    );

    // Finalize before appending; the SDK setMessages callback applies synchronously.
    void closeOpenComponents(
      setMessages,
      notifyMessageUpdate,
      componentMap
    ).catch(() => undefined);
    const newMessage: IDIChatMessage = {
      id: generateInternalId(),
      role: 'assistant',
      metadata: { timestamp: new Date().toISOString() },
      parts: [newPart],
    };

    setMessages((messages) => [...messages, newMessage]);
    void notifyMessageUpdate(newMessage).catch(() => undefined);
  };
