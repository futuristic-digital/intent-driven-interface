import { type IDIChatMessage } from '@intent-driven-interface/backend/api-contracts';
import { type ToolUIPart, type UIToolInvocation } from 'ai';

import {
  isComponentId,
  type ComponentMap,
} from '../component-map/define-component-map.js';
import { type ComponentToolState } from '../component-map/define-idi-component.js';
import {
  bindComponentActions,
  type ComponentActionRuntime,
} from '../lifecycle/component-actions.js';
import {
  getComponentIdFromToolType,
  isComponentToolPart,
  readToolMetadata,
} from '../lifecycle/component-part.js';
import {
  type ComponentRenderUIPart,
  type IDIRenderMessage,
} from './idi-render-message.js';

const convertToolPartToRenderPart = <
  COMPONENT_MAP extends ComponentMap,
  K extends Extract<keyof COMPONENT_MAP, string>,
>(
  componentMap: COMPONENT_MAP,
  componentId: K,
  part: ToolUIPart,
  runtime: ComponentActionRuntime,
  hideOpenComponents: boolean
): ComponentRenderUIPart<COMPONENT_MAP, K> | null => {
  const component = componentMap[componentId];
  if (!component) {
    throw new Error(`component '${componentId}' not found in component map`);
  }

  // Partial tool args stream as DeepPartial JSON — do not mount UI until complete.
  if (part.state === 'input-streaming') return null;

  // Preserve the public tool-call shape for this registered component.
  const toolCall = part as UIToolInvocation<COMPONENT_MAP[K]> & {
    state: ComponentToolState;
  };
  const { input, ...toolCallWithoutInput } = toolCall;
  // Stored invocations can predate the current component schema.
  const parsedInput = component.inputSchema.safeParse(input ?? {});
  if (!parsedInput.success) {
    console.error(
      'component input schema validation failed',
      componentId,
      input,
      parsedInput.error
    );
    return null;
  }

  const initialInput = parsedInput.data;
  const metadata = readToolMetadata(part);
  const isLive = !metadata.closedAt;
  // Keep live actions hidden until the assistant stream finishes.
  if (hideOpenComponents && isLive) return null;
  const componentInput =
    metadata.componentInputState === undefined
      ? initialInput
      : component.inputSchema.parse(metadata.componentInputState);
  const draftOutput = isLive ? metadata.componentOutputState : undefined;

  return {
    type: 'render-component',
    componentId,
    toolState: toolCall.state,
    isLive,
    componentInput,
    componentInputInitial: initialInput,
    componentOutput: isLive ? draftOutput : toolCall.output,
    componentProps: {
      componentInput,
      componentOutput: draftOutput,
      ...bindComponentActions(
        { componentMap, componentId, component, part, initialInput },
        runtime
      ),
    },
    ...component,
    _toolCall: toolCallWithoutInput,
  };
};

/** Binds component actions without executing them during conversion. */
export const convertIDIChatMessagesToRenderMessages = <
  COMPONENT_MAP extends ComponentMap,
>(
  messages: IDIChatMessage[],
  componentMap: COMPONENT_MAP,
  runtime: ComponentActionRuntime,
  hideOpenComponents: boolean
): IDIRenderMessage<COMPONENT_MAP>[] =>
  messages.map(({ id, role, metadata, parts: originalParts }) => {
    const parts = originalParts.flatMap(
      (part): IDIRenderMessage<COMPONENT_MAP>['parts'] => {
        if (isComponentToolPart(part)) {
          const componentId = getComponentIdFromToolType(part.type);
          if (!isComponentId(componentMap, componentId)) {
            console.error(
              `tool '${componentId}' not found in component map`,
              `component map keys: ${Object.keys(componentMap).join(', ')}`
            );
            return [];
          }

          const renderPart = convertToolPartToRenderPart(
            componentMap,
            componentId,
            part,
            runtime,
            hideOpenComponents
          );
          return renderPart ? [renderPart] : [];
        }

        // SDK media and custom parts have no IDI renderer.
        if (
          part.type === 'text' ||
          part.type === 'reasoning' ||
          part.type === 'step-start'
        ) {
          return [part];
        }

        return [];
      }
    );

    return { id, role, metadata, parts };
  });
