import type { UseChatHelpers } from '@ai-sdk/react';
import type { IDIChatMessage } from '@intent-driven-interface/backend/api-contracts';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { ComponentMap } from '../component-map/define-component-map.js';
import type { OpenComponent } from '../component-map/define-idi-component.js';
import {
  closeInactiveComponents,
  closeOpenComponents,
  getPendingComponentClosure,
  isClosingComponent,
} from '../lifecycle/component-lifecycle.js';
import { hasInactiveComponents } from '../lifecycle/component-displacement.js';
import { createAppendComponentMessage } from '../lifecycle/open-component.js';
import type { NotifyMessageUpdate } from '../transport/use-message-updates.js';

/** Coordinates chat turns with local actions so a new turn sees finalized components. */
export function useConversationActions<COMPONENT_MAP extends ComponentMap>(
  {
    messages,
    status,
    setMessages,
    sendMessage,
  }: Pick<
    UseChatHelpers<IDIChatMessage>,
    'messages' | 'status' | 'setMessages' | 'sendMessage'
  >,
  components: COMPONENT_MAP,
  notifyMessageUpdate: NotifyMessageUpdate
) {
  const activeTurn = useRef<Promise<void> | undefined>(undefined);
  const canInteract = useCallback(
    () => !activeTurn.current && !isClosingComponent(setMessages),
    [setMessages]
  );

  // Host-loaded history and incoming assistant parts can displace an open view.
  useEffect(() => {
    if (
      status === 'ready' &&
      !isClosingComponent(setMessages) &&
      hasInactiveComponents(messages, components)
    ) {
      void closeInactiveComponents(
        setMessages,
        notifyMessageUpdate,
        components
      ).catch(() => undefined);
    }
  }, [messages, status, setMessages, notifyMessageUpdate, components]);

  const sendAgentTurn = useCallback(
    async (text?: string) => {
      if (text === undefined) {
        // Automatic follow-ups never queue behind another interaction.
        if (!canInteract()) return;
      } else {
        const closure = getPendingComponentClosure(setMessages);
        if (closure) await closure;
        while (activeTurn.current)
          await activeTurn.current.catch(() => undefined);
      }

      // Claim the turn before invoking callbacks that may synchronously trigger another action.
      const turn = Promise.resolve().then(async () => {
        if (text === undefined) return sendMessage();
        await closeOpenComponents(setMessages, notifyMessageUpdate, components);
        await sendMessage({
          text,
          metadata: { timestamp: new Date().toISOString() },
        });
      });
      activeTurn.current = turn;
      try {
        await turn;
      } finally {
        activeTurn.current = undefined;
      }
    },
    [canInteract, setMessages, sendMessage, notifyMessageUpdate, components]
  );

  const appendComponentMessage = useMemo(
    () =>
      createAppendComponentMessage(
        setMessages,
        components,
        notifyMessageUpdate,
        canInteract
      ),
    [setMessages, components, notifyMessageUpdate, canInteract]
  );
  const openComponent = useCallback<OpenComponent<COMPONENT_MAP>>(
    (componentId, ...[input]) => {
      if (components[componentId]?.disableStandaloneOpen) {
        console.error(
          `Standalone open is disabled for component '${componentId}'.`
        );
        return;
      }
      appendComponentMessage(componentId, { initial: input ?? {} });
    },
    [appendComponentMessage, components]
  );

  return {
    openComponent,
    sendAgentTurn,
    runtime: {
      appendComponentMessage,
      setMessages,
      notifyMessageUpdate,
      requestAgentFollowUp: sendAgentTurn,
      canInteract,
    },
  };
}
