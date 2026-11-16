import { type UseChatHelpers } from '@ai-sdk/react';
import { type UIToolMetadata } from '@intent-driven-interface/backend/api-contracts';
import { generateId, type ToolUIPart } from 'ai';
import { z } from 'zod';

import { type AiSdkMessage } from './ai-sdk-message.format';
import { closeOpenComponents } from './component-lifecycle';
import { saveMessage, type IDIBackend } from './save-message';
import { type ComponentMap } from '../component-map/define-component-map';
import {
  type CallComponent,
  type CallComponentOptions,
  type RestoreComponent,
  type ComponentCallInput,
} from '../component-map/define-idi-component';

/** Matches external history/pin IDs to registered component keys. */
export const isComponentId = <COMPONENT_MAP extends ComponentMap>(
  componentMap: COMPONENT_MAP,
  componentId: string
): componentId is Extract<keyof COMPONENT_MAP, string> =>
  componentId in componentMap;

/** Internal options: public flags plus resolved `resumeCaller` from a bound caller. */
export type CallComponentOptionsInternal = CallComponentOptions & {
  resumeCaller?: NonNullable<UIToolMetadata['resumeCaller']>;
};

/**
 * Builds a `callComponent` that appends a client-initiated tool part and
 * persists it via `save-message` (no LLM turn).
 */
export const createRestoreComponent = <COMPONENT_MAP extends ComponentMap>(
  setMessages: UseChatHelpers<AiSdkMessage>['setMessages'],
  componentMap: COMPONENT_MAP,
  idiBackend: IDIBackend
): RestoreComponent<COMPONENT_MAP> =>
  ((
    componentId: Extract<keyof COMPONENT_MAP, string>,
    inputs?: ComponentCallInput<object>,
    options?: CallComponentOptionsInternal
  ) => {
    if (!isComponentId(componentMap, componentId)) {
      console.error(
        `component '${componentId}' not found in component map`,
        `component map keys: ${Object.keys(componentMap).join(', ')}`
      );
      return;
    }

    const parsedInput = componentMap[componentId]?.inputSchema.safeParse(
      inputs?.componentInput ?? {}
    );
    if (!parsedInput?.success) {
      console.error(
        'component input schema validation failed',
        componentId,
        parsedInput?.error
      );
      return;
    }

    const componentInputState =
      inputs?.componentInputState === undefined
        ? undefined
        : componentMap[componentId]?.inputSchema.parse(
            inputs.componentInputState
          );

    // Finalize before appending; the SDK setMessages callback applies synchronously.
    void closeOpenComponents(setMessages, idiBackend, componentMap).catch(
      console.error
    );
    const resumeCaller = options?.resumeCaller;
    const newPart: ToolUIPart = {
      type: `tool-${componentId}`,
      toolCallId: `internal_${generateId()}`,
      state: 'output-available',
      output: undefined,
      input: parsedInput.data,
      toolMetadata: {
        ...(componentInputState === undefined
          ? {}
          : { componentInputState: z.json().parse(componentInputState) }),
        ...(resumeCaller ? { resumeCaller } : {}),
      },
    };

    const newMessage: AiSdkMessage = {
      id: `internal_${generateId()}`,
      role: 'assistant',
      metadata: { timestamp: new Date().toISOString() },
      parts: [newPart],
    };

    setMessages((messages) => [...messages, newMessage]);
    // callComponent never hits the agent stream — persist the new row directly.
    void saveMessage(idiBackend, newMessage).catch(console.error);
  }) as RestoreComponent<COMPONENT_MAP>;

/** Normal component calls provide a single input; restoration stays at the host boundary. */
export const createCallComponent = <COMPONENT_MAP extends ComponentMap>(
  setMessages: UseChatHelpers<AiSdkMessage>['setMessages'],
  componentMap: COMPONENT_MAP,
  idiBackend: IDIBackend
): CallComponent<COMPONENT_MAP> =>
  ((
    componentId: Extract<keyof COMPONENT_MAP, string>,
    input?: object,
    options?: CallComponentOptionsInternal
  ) => {
    const restore = createRestoreComponent(
      setMessages,
      componentMap,
      idiBackend
    );
    // The runtime validates the heterogeneous payload against the registered schema.
    // @ts-expect-error The component-map key correlates the validated input at runtime.
    restore(componentId, { componentInput: input ?? {} }, options);
  }) as CallComponent<COMPONENT_MAP>;
