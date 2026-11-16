import { type UseChatHelpers } from '@ai-sdk/react';
import { type ToolUIPart, type UIToolInvocation } from 'ai';
import { z } from 'zod';

import { type AiSdkMessage } from './ai-sdk-message.format.js';
import {
  type CallComponentOptionsInternal,
  isComponentId,
} from './call-component.js';
import { resolveComponentInput } from './component-input.js';
import {
  findComponentPart,
  finalizeComponentPart,
  isLatestComponent,
  readToolMetadata,
  updateComponentPart,
} from './component-lifecycle.js';
import { type IDIBackend } from './save-message.js';
import { type ComponentRenderUIPart, type IDIMessage } from './idi-message.js';
import { type ComponentMap } from '../component-map/define-component-map.js';
import {
  type CallComponent,
  type RestoreComponent,
  type CallComponentOptions,
  type ComponentCallInput,
  type ComponentRenderProps,
  type ComponentToolState,
  type CloseComponentOptions,
  type ComponentStateUpdate,
} from '../component-map/define-idi-component.js';

const toComponentRenderPart = <
  COMPONENT_MAP extends ComponentMap,
  K extends Extract<keyof COMPONENT_MAP, string>,
>(
  componentMap: COMPONENT_MAP,
  componentId: K,
  part: ToolUIPart,
  restoreComponent: RestoreComponent<COMPONENT_MAP>,
  setMessages: UseChatHelpers<AiSdkMessage>['setMessages'],
  idiBackend: IDIBackend,
  requestAgentFollowUp: () => Promise<void>
): ComponentRenderUIPart<COMPONENT_MAP, K> | null => {
  const component = componentMap[componentId];
  if (!component) {
    throw new Error(`component '${componentId}' not found in component map`);
  }

  const toolCall = part as UIToolInvocation<COMPONENT_MAP[K]> & {
    state: ComponentToolState;
  };

  // Partial tool args stream as DeepPartial JSON — do not mount UI until complete.
  if (toolCall.state === 'input-streaming') {
    return null;
  }

  const { input: _input, ...toolCallWithoutInput } = toolCall;
  // Validate tool and pinned inputs against the component's current schema.
  const parsedInput = component.inputSchema.safeParse(toolCall.input ?? {});

  if (!parsedInput.success) {
    console.error(
      'component input schema validation failed',
      componentId,
      toolCall.input,
      parsedInput.error
    );
    return null;
  }

  const resolvedInput = parsedInput.data;
  const metadata = readToolMetadata(part);
  const effectiveInput = resolveComponentInput(
    component,
    resolvedInput,
    metadata.componentInputState
  );
  const getCurrentPart = () =>
    findComponentPart(setMessages, toolCall.toolCallId);

  const callComponentWithInternalOptions = restoreComponent as (
    targetId: Extract<keyof COMPONENT_MAP, string>,
    inputs?: ComponentCallInput<object>,
    options?: CallComponentOptionsInternal
  ) => void;

  const boundCallComponent = ((
    targetId: Extract<keyof COMPONENT_MAP, string>,
    input?: object,
    options?: CallComponentOptions
  ) => {
    callComponentWithInternalOptions(
      targetId,
      { componentInput: input ?? {} },
      {
        ...options,
        ...(options?.resumeCallerAfterOutput
          ? {
              resumeCaller: {
                componentId,
                input: z.json().parse(resolvedInput),
                // Read current state, including changes earlier in the same event.
                ...(readToolMetadata(getCurrentPart() ?? part)
                  .componentInputState === undefined
                  ? {}
                  : {
                      componentInputState: readToolMetadata(
                        getCurrentPart() ?? part
                      ).componentInputState,
                    }),
              },
            }
          : {}),
      }
    );
  }) as CallComponent<COMPONENT_MAP>;

  /** State setters validate at the schema/wire boundary and never finalize output. */
  const componentProps: ComponentRenderProps<COMPONENT_MAP[K]> = {
    componentInput: effectiveInput,
    componentOutputState: metadata.closedAt
      ? undefined
      : metadata.componentOutputState,
    setComponentInputState: (update: ComponentStateUpdate<object>) => {
      void updateComponentPart(
        setMessages,
        toolCall.toolCallId,
        (current) => {
          const currentMetadata = readToolMetadata(current);
          if (currentMetadata.closedAt) return current;
          const previous = resolveComponentInput(
            component,
            current.input,
            currentMetadata.componentInputState
          );
          const next = typeof update === 'function' ? update(previous) : update;
          const value = z.json().parse(component.inputSchema.parse(next));
          return {
            ...current,
            toolMetadata: { ...currentMetadata, componentInputState: value },
          };
        },
        idiBackend
      ).catch(console.error);
    },
    ...(component.outputSchema
      ? {
          setComponentOutputState: (
            update: ComponentStateUpdate<object | undefined>
          ) => {
            void updateComponentPart(
              setMessages,
              toolCall.toolCallId,
              (current) => {
                const currentMetadata = readToolMetadata(current);
                if (currentMetadata.closedAt) return current;
                const previous =
                  currentMetadata.componentOutputState === undefined
                    ? undefined
                    : component.outputSchema?.parse(
                        currentMetadata.componentOutputState
                      );
                const next =
                  typeof update === 'function' ? update(previous) : update;
                const { componentOutputState: _previous, ...retainedMetadata } =
                  currentMetadata;
                return {
                  ...current,
                  toolMetadata: {
                    ...retainedMetadata,
                    ...(next === undefined
                      ? {}
                      : {
                          componentOutputState: z
                            .json()
                            .parse(component.outputSchema?.parse(next)),
                        }),
                  },
                };
              },
              idiBackend
            ).catch(console.error);
          },
        }
      : {}),
    closeComponent: async (options?: CloseComponentOptions<object>) => {
      const current = getCurrentPart();
      if (!current || readToolMetadata(current).closedAt) return;
      const currentMetadata = readToolMetadata(current);
      const output =
        options?.setComponentOutput === undefined
          ? currentMetadata.componentOutputState
          : component.outputSchema?.parse(options.setComponentOutput);
      await updateComponentPart(
        setMessages,
        toolCall.toolCallId,
        (latest) => finalizeComponentPart(latest, output),
        idiBackend
      );
      if (!isLatestComponent(setMessages, toolCall.toolCallId)) return;
      const resumeCaller = currentMetadata.resumeCaller;
      if (
        resumeCaller &&
        isComponentId(componentMap, resumeCaller.componentId)
      ) {
        // Restore both invocation input and edited state when resuming the caller.
        const callerInput = componentMap[
          resumeCaller.componentId
        ]?.inputSchema.parse(resumeCaller.input);
        const callerInputState = componentMap[
          resumeCaller.componentId
        ]?.inputSchema
          .optional()
          .parse(resumeCaller.componentInputState);
        callComponentWithInternalOptions(resumeCaller.componentId, {
          componentInput: callerInput,
          componentInputState: callerInputState,
        });
      } else if (options?.agentFollowUp !== false) {
        await requestAgentFollowUp();
      }
    },
    useCallComponent: (() => boundCallComponent) as ComponentRenderProps<
      COMPONENT_MAP[K]
    >['useCallComponent'],
  };

  return {
    type: 'render-component',
    componentId,
    toolState: toolCall.state,
    isClosed: Boolean(metadata.closedAt),
    inputSnapshot: {
      componentInput: resolvedInput,
      ...(metadata.componentInputState === undefined
        ? {}
        : {
            componentInputState: component.inputSchema.parse(
              metadata.componentInputState
            ),
          }),
    },
    componentOutput: toolCall.output,
    componentProps,
    ...component,
    _toolCall: toolCallWithoutInput,
  };
};

/**
 * Maps AI SDK wire messages into IDI render messages for the chat UI.
 *
 * Tool parts become `render-component` entries wired with input/output state setters,
 * explicit closure, and `useCallComponent`.
 * Unknown tool ids are dropped.
 */
export const convertAiSdkMessagesToIDIMessages = <
  COMPONENT_MAP extends ComponentMap,
>(
  aiSdkMessages: Array<AiSdkMessage>,
  componentMap: COMPONENT_MAP,
  restoreComponent: RestoreComponent<COMPONENT_MAP>,
  setMessages: UseChatHelpers<AiSdkMessage>['setMessages'],
  idiBackend: IDIBackend,
  requestAgentFollowUp: () => Promise<void> = async () => undefined
): Array<IDIMessage<COMPONENT_MAP>> => {
  return aiSdkMessages.flatMap((message) => {
    const { id, role, metadata, parts: originalParts } = message;
    const timestamp = metadata?.timestamp ?? '';
    if (!timestamp) {
      console.error('timestamp is missing in message.', message);
    }

    const parts = originalParts
      .filter(
        (part) =>
          part.type !== 'file' &&
          part.type !== 'source-url' &&
          part.type !== 'source-document' &&
          part.type !== 'dynamic-tool'
      )
      .flatMap((part): IDIMessage<COMPONENT_MAP>['parts'] => {
        if ('toolCallId' in part) {
          const componentId = part.type.replace(/^tool-/, '');
          if (!isComponentId(componentMap, componentId)) {
            console.error(
              `tool '${componentId}' not found in component map`,
              `component map keys: ${Object.keys(componentMap).join(', ')}`
            );
            return [];
          }

          const renderPart = toComponentRenderPart(
            componentMap,
            componentId,
            part,
            restoreComponent,
            setMessages,
            idiBackend,
            requestAgentFollowUp
          );
          return renderPart ? [renderPart] : [];
        }

        // IDI renders text and reasoning; SDK media/custom parts have no renderer.
        if (
          part.type === 'text' ||
          part.type === 'reasoning' ||
          part.type === 'step-start'
        ) {
          return [part];
        }

        return [];
      });

    return { id, role, timestamp, parts };
  });
};

/**
 * Maps IDI render messages back to AI SDK wire format.
 *
 * `render-component` parts become `tool-{componentId}` using `_toolCall`.
 *
 * @param idiMessages Chronological IDI messages, or `undefined` to pass through.
 * @returns AI SDK messages, or `undefined` when the input was `undefined`.
 */
export const convertIDIMessagesToAiSdkMessages = <
  COMPONENT_MAP extends ComponentMap,
>(
  idiMessages?: Array<IDIMessage<COMPONENT_MAP>>
): Array<AiSdkMessage> | undefined =>
  idiMessages?.map((message) => ({
    id: message.id,
    role: message.role,
    metadata: { timestamp: message.timestamp },
    parts: message.parts.map((part) => {
      if (part.type === 'render-component') {
        return {
          type: `tool-${String(part.componentId)}`,
          ...part._toolCall,
          input: part.inputSnapshot.componentInput,
        } as ToolUIPart;
      }

      return part;
    }),
  }));
