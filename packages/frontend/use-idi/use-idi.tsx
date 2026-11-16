'use client';

import { useChat, type UIMessage as UIMessageAiSdk } from '@ai-sdk/react';
import {
  type ClientTimeContext,
  type ComponentInputSnapshot,
  type PinnedIDIComponent,
} from '@intent-driven-interface/backend/api-contracts';
import { trimMessagesForAgent } from '@intent-driven-interface/backend/trim-messages-for-agent';
import {
  type ChatOnErrorCallback,
  type ChatOnFinishCallback,
  type ChatStatus,
  DefaultChatTransport,
} from 'ai';
import { useCallback, useEffect, useRef, useState } from 'react';

import { type AiSdkMessage } from './ai-sdk-message.format';
import { createCallComponent, createRestoreComponent } from './call-component';
import {
  closeOpenComponents,
  closeInactiveComponents,
  hasInactiveComponents,
} from './component-lifecycle';
import { convertComponentMapForBackend } from './component-map-for-backend.conversion';
import { type IDIBackend } from './save-message';
import { type IDIMessage } from './idi-message';
import { convertAiSdkMessagesToIDIMessages } from './idi-message.conversion';
import { type ComponentMap } from '../component-map/define-component-map';
import {
  type CallComponent,
  type RestoreComponent,
} from '../component-map/define-idi-component';

type UseIDIOptions<COMPONENT_MAP extends ComponentMap> = {
  id?: string;
  idiBackend: IDIBackend;
  componentMap: COMPONENT_MAP;
  /**
   * Seed messages used only when the backend has no history yet
   * (e.g. welcome text from `defineInitialMessages`).
   */
  initialMessages?: AiSdkMessage[];
  onError?: ChatOnErrorCallback;
  onFinish?: ChatOnFinishCallback<UIMessageAiSdk>;
};

/**
 * Connects the host app chat UI to the IDI backend response generator.
 *
 * The backend runs a single LLM turn per request. The agent loop lives here:
 * closing a component posts its finalized output so the model can continue
 * unless `agentFollowUp: false`. Draft state updates never trigger a request.
 */
export const useIDI = <COMPONENT_MAP extends ComponentMap>(
  options: UseIDIOptions<COMPONENT_MAP>
): {
  id: string;
  messages: IDIMessage<COMPONENT_MAP>[];
  error: Error | undefined;
  /** Opens a registered component in the chat flow (used by summaries / sidebar). */
  callComponent: CallComponent<COMPONENT_MAP>;
  /** Host-only restoration of original input and optional saved state. */
  restoreComponent: RestoreComponent<COMPONENT_MAP>;
  /** Whether another older page may exist beyond the current thread. */
  hasOlderMessages: boolean;
  /** True while the initial message history request on mount is in flight. */
  isLoadingInitialMessages: boolean;
  /** True while {@link loadOlderMessages} is in flight. */
  isLoadingOlderMessages: boolean;
  /** True while the initial pinned-components request on mount is in flight. */
  isLoadingPinnedComponents: boolean;
  /**
   * Fetches and prepends the next older history page.
   * @returns `true` when a page was prepended (so the host can preserve scroll).
   */
  loadOlderMessages: () => Promise<boolean>;
  /** Pinned components for the sidebar, ordered newest-first. */
  pinnedComponents: PinnedIDIComponent[];
  /** Persists a pin with distinct original and edited input snapshots and updates {@link pinnedComponents}. */
  pinComponent: (
    componentId: string,
    snapshot: ComponentInputSnapshot
  ) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  status: ChatStatus;
} => {
  const [pinnedComponents, setPinnedComponents] = useState<
    PinnedIDIComponent[]
  >([]);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isLoadingInitialMessages, setIsLoadingInitialMessages] =
    useState(true);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [isLoadingPinnedComponents, setIsLoadingPinnedComponents] =
    useState(true);
  const seedMessagesRef = useRef(options.initialMessages);
  seedMessagesRef.current = options.initialMessages;
  const idiBackendRef = useRef(options.idiBackend);
  idiBackendRef.current = options.idiBackend;
  const componentMapRef = useRef(options.componentMap);
  componentMapRef.current = options.componentMap;

  const {
    id,
    messages,
    setMessages,
    addToolOutput,
    error,
    sendMessage: sendAiSdkMessage,
    status,
  } = useChat<AiSdkMessage>({
    ...(options.id ? { id: options.id } : {}),
    transport: new DefaultChatTransport({
      api: options.idiBackend.url,
      prepareSendMessagesRequest: async ({ messages }) => ({
        headers: options.idiBackend.requestHeaders,
        body: {
          operation: 'generate-response',
          // Capture at send time so idle chats and follow-ups get fresh user time.
          clientTimeContext: {
            currentDateTime: new Date().toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          } satisfies ClientTimeContext,
          messages: trimMessagesForAgent(messages),
          componentMap: await convertComponentMapForBackend(
            options.componentMap
          ),
        },
      }),
    }),
    onError: options.onError,
    onFinish: options.onFinish,
    onToolCall: ({ toolCall: { providerExecuted, toolName, toolCallId } }) => {
      if (providerExecuted === undefined) {
        // Seed output-available with undefined so the component can render
        // before the user acts. Real output arrives when the component closes;
        // undefined here must not trigger an automatic follow-up send.
        addToolOutput({
          tool: toolName,
          toolCallId,
          state: 'output-available',
          output: undefined,
        });
      }
    },
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { url, requestHeaders } = idiBackendRef.current;

      const [historyResponse, pinnedResponse] = await Promise.all([
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...requestHeaders },
          body: JSON.stringify({ operation: 'load-message-history' }),
        }),
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...requestHeaders },
          body: JSON.stringify({ operation: 'list-pinned-components' }),
        }),
      ]);

      if (cancelled) {
        return;
      }

      try {
        if (historyResponse.ok) {
          const history = (await historyResponse.json()) as {
            messages: AiSdkMessage[];
            hasOlderMessages: boolean;
          };

          if (history.messages.length > 0) {
            setMessages(history.messages);
            setHasOlderMessages(history.hasOlderMessages);
          } else if (seedMessagesRef.current?.length) {
            setMessages(seedMessagesRef.current);
          }
        } else if (seedMessagesRef.current?.length) {
          setMessages(seedMessagesRef.current);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingInitialMessages(false);
        }
      }

      try {
        if (pinnedResponse.ok) {
          const payload = (await pinnedResponse.json()) as {
            pinnedComponents: PinnedIDIComponent[];
          };
          setPinnedComponents(payload.pinnedComponents);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPinnedComponents(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setMessages]);

  // Reconcile older history and components displaced by incoming assistant parts.
  useEffect(() => {
    if (
      status === 'ready' &&
      hasInactiveComponents(messages, componentMapRef.current)
    ) {
      void closeInactiveComponents(
        setMessages,
        idiBackendRef.current,
        componentMapRef.current
      ).catch(console.error);
    }
  }, [messages, setMessages, status]);

  const sendMessage = useCallback(
    async (text: string) => {
      await closeOpenComponents(
        setMessages,
        idiBackendRef.current,
        componentMapRef.current
      );
      await sendAiSdkMessage({
        text,
        metadata: { timestamp: new Date().toISOString() },
      });
    },
    [sendAiSdkMessage, setMessages]
  );

  const loadOlderMessages = useCallback(async (): Promise<boolean> => {
    const oldestMessage = messages[0];
    const beforeTimestamp = oldestMessage?.metadata?.timestamp;

    if (!beforeTimestamp || isLoadingOlderMessages) {
      return false;
    }

    setIsLoadingOlderMessages(true);

    try {
      const { url, requestHeaders } = idiBackendRef.current;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...requestHeaders },
        body: JSON.stringify({
          operation: 'load-message-history',
          beforeTimestamp,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const payload = (await response.json()) as {
        messages: AiSdkMessage[];
        hasOlderMessages: boolean;
      };

      setMessages((currentMessages) => [
        ...payload.messages,
        ...currentMessages,
      ]);
      setHasOlderMessages(payload.hasOlderMessages);
      return payload.messages.length > 0;
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }, [isLoadingOlderMessages, messages, setMessages]);

  /**
   * Pins both original input and captured input state, then replaces local pin state
   * from the authoritative `{ pinnedComponents }` response.
   */
  const pinComponent = useCallback(
    async (componentId: string, snapshot: ComponentInputSnapshot) => {
      const { url, requestHeaders } = idiBackendRef.current;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...requestHeaders },
        body: JSON.stringify({
          operation: 'pin-component',
          componentId,
          ...snapshot,
        }),
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        pinnedComponents: PinnedIDIComponent[];
      };
      setPinnedComponents(payload.pinnedComponents);
    },
    []
  );

  // Stable across renders so sidebar summaries can reopen components into chat.
  const callComponent = useCallback<CallComponent<COMPONENT_MAP>>(
    ((...args) =>
      createCallComponent(
        setMessages,
        componentMapRef.current,
        idiBackendRef.current
      )(...args)) as CallComponent<COMPONENT_MAP>,
    [setMessages]
  );

  const restoreComponent = useCallback<RestoreComponent<COMPONENT_MAP>>(
    ((...args) =>
      createRestoreComponent(
        setMessages,
        componentMapRef.current,
        idiBackendRef.current
      )(...args)) as RestoreComponent<COMPONENT_MAP>,
    [setMessages]
  );

  return {
    id,
    messages: convertAiSdkMessagesToIDIMessages(
      messages,
      options.componentMap,
      restoreComponent,
      setMessages,
      idiBackendRef.current,
      () => sendAiSdkMessage()
    ),
    error,
    callComponent,
    restoreComponent,
    hasOlderMessages,
    isLoadingInitialMessages,
    isLoadingOlderMessages,
    isLoadingPinnedComponents,
    loadOlderMessages,
    pinnedComponents,
    pinComponent,
    sendMessage,
    status,
  };
};
