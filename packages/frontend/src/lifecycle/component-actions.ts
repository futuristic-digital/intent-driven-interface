import { type UIToolMetadata } from '@intent-driven-interface/backend/api-contracts';
import { type ToolUIPart } from 'ai';
import { z } from 'zod';

import {
  isComponentId,
  type ComponentMap,
} from '../component-map/define-component-map.js';
import {
  type ComponentRenderProps,
  type ComponentStateUpdate,
  type OpenComponentOptions,
} from '../component-map/define-idi-component.js';
import { type NotifyMessageUpdate } from '../transport/use-message-updates.js';
import { isLatestComponent } from './component-displacement.js';
import { updateInputDraft, updateOutputDraft } from './component-draft.js';
import {
  commitComponentClosure,
  findComponentPart,
  updateComponentPart,
} from './component-lifecycle.js';
import { type SetMessages } from './component-message-mutation.js';
import { readToolMetadata } from './component-part.js';
import { type AppendComponentMessage } from './open-component.js';

/** Operations used by bound actions when invoked, not during message conversion. */
export type ComponentActionRuntime = {
  appendComponentMessage: AppendComponentMessage;
  setMessages: SetMessages;
  notifyMessageUpdate: NotifyMessageUpdate;
  requestAgentFollowUp: () => Promise<void>;
  canInteract: () => boolean;
};

type ComponentActions = Omit<
  ComponentRenderProps<ComponentMap[string]>,
  'componentInput' | 'componentOutput'
>;

/** Binds one invocation's actions; draft updaters read the latest SDK snapshot. */
export const bindComponentActions = (
  {
    componentMap,
    componentId,
    component,
    part,
    initialInput,
  }: {
    componentMap: ComponentMap;
    componentId: string;
    component: Pick<ComponentMap[string], 'inputSchema' | 'outputSchema'>;
    part: ToolUIPart;
    initialInput: unknown;
  },
  runtime: ComponentActionRuntime
): ComponentActions => {
  const { toolCallId } = part;
  const {
    appendComponentMessage,
    setMessages,
    notifyMessageUpdate,
    requestAgentFollowUp,
    canInteract,
  } = runtime;
  const getCurrentPart = () => findComponentPart(setMessages, toolCallId);

  const editDraft = (
    transform: (metadata: UIToolMetadata, current: ToolUIPart) => UIToolMetadata
  ): void => {
    if (!canInteract()) return;
    // Catch notification rejections without swallowing synchronous schema or updater errors.
    void updateComponentPart(
      setMessages,
      toolCallId,
      (current) => {
        const metadata = readToolMetadata(current);
        if (metadata.closedAt) return current;
        const nextMetadata = transform(metadata, current);
        return nextMetadata === metadata
          ? current
          : { ...current, toolMetadata: nextMetadata };
      },
      notifyMessageUpdate
    ).catch(() => undefined);
  };

  const openComponent = (
    targetId: string,
    input?: object,
    options?: OpenComponentOptions
  ) => {
    if (!canInteract()) return;
    let resumeCaller: UIToolMetadata['resumeCaller'];
    if (options?.reopenThisComponentOnClose) {
      const callerInput = z.json().parse(initialInput);
      // Capture state updates made earlier in the same event.
      const { componentInputState } = readToolMetadata(
        getCurrentPart() ?? part
      );
      resumeCaller = {
        componentId,
        input: callerInput,
        ...(componentInputState === undefined ? {} : { componentInputState }),
      };
    }
    appendComponentMessage(targetId, { initial: input ?? {} }, resumeCaller);
  };

  return {
    setComponentInput: (update) =>
      editDraft((metadata, current) =>
        updateInputDraft(component, metadata, current.input, update)
      ),
    ...(component.outputSchema
      ? {
          setComponentOutput: (
            update: ComponentStateUpdate<object | undefined>
          ) =>
            editDraft((metadata) =>
              updateOutputDraft(component, metadata, update)
            ),
        }
      : {}),
    closeComponent: async (options) => {
      if (!canInteract()) return;
      const current = getCurrentPart();
      if (!current) return;
      const currentMetadata = readToolMetadata(current);
      if (currentMetadata.closedAt) return;
      const output =
        options?.setComponentOutput === undefined
          ? currentMetadata.componentOutputState
          : component.outputSchema?.parse(options.setComponentOutput);
      const closed = await commitComponentClosure(
        setMessages,
        toolCallId,
        output,
        notifyMessageUpdate
      );
      if (!closed || !isLatestComponent(setMessages, toolCallId)) return;
      const resumeCaller = currentMetadata.resumeCaller;
      if (
        resumeCaller &&
        isComponentId(componentMap, resumeCaller.componentId)
      ) {
        appendComponentMessage(resumeCaller.componentId, {
          initial: resumeCaller.input,
          override: resumeCaller.componentInputState,
        });
      } else if (options?.agentFollowUp !== false) {
        await requestAgentFollowUp();
      }
    },
    useOpenComponent: () => openComponent,
  };
};
