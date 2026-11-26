'use client';

import { useChat } from '@ai-sdk/react';
import type { IDIChatMessage } from '@intent-driven-interface/backend/api-contracts';
import type { ChatOnErrorCallback, ChatStatus } from 'ai';

import { useConversationActions } from './chat/use-conversation-actions.js';
import type { ComponentMap } from './component-map/define-component-map.js';
import type { OpenComponent } from './component-map/define-idi-component.js';
import type { IDIRenderMessage } from './rendering/idi-render-message.js';
import { convertIDIChatMessagesToRenderMessages } from './rendering/render-message.conversion.js';
import {
  createGenerationTransport,
  type IDIBackend,
} from './transport/idi-backend.js';
import { useMessageUpdates } from './transport/use-message-updates.js';


type UseIDIOptions<COMPONENT_MAP extends ComponentMap> = {
  /** Client-side only. Changing this ID starts a fresh chat; omit to generate one. */
  id?: string;
  backend: IDIBackend;
  /** Registry for rendering components and exposing their schemas to the model. */
  components: COMPONENT_MAP;
  /** Host-loaded history or seed messages. Later changes don't replace chat state. */
  initialMessages?: IDIChatMessage[];
  /** Generation errors only. Failed component updates surface in the returned `error`. */
  onError?: ChatOnErrorCallback;

};

/** Connects an in-memory component conversation to the host's IDI endpoint. */
export function useIDI<COMPONENT_MAP extends ComponentMap>({
  id,
  backend,
  components,
  initialMessages,
  onError,
}: UseIDIOptions<COMPONENT_MAP>): {
  id: string;
  messages: IDIRenderMessage<COMPONENT_MAP>[];
  /** Latest generation error, or a failed component message update. */
  error: Error | undefined;
  /** Opens a registered component without a model turn, unless standalone open is disabled. */
  openComponent: OpenComponent<COMPONENT_MAP>;
  sendMessage: (text: string) => Promise<void>;
  status: ChatStatus;
} {
  const chat = useChat<IDIChatMessage>({
    id,
    messages: initialMessages,
    transport: createGenerationTransport(backend, components),
    onError,

  });
  const { notifyMessageUpdate, updateError } = useMessageUpdates(backend);
  const { openComponent, sendAgentTurn, runtime } = useConversationActions(
    chat,
    components,
    notifyMessageUpdate
  );
  const isGenerating =
    chat.status === 'submitted' || chat.status === 'streaming';
  return {
    id: chat.id,
    messages: convertIDIChatMessagesToRenderMessages(
          chat.messages,
          components,
          runtime,
          isGenerating
        ),
    error: chat.error ?? updateError,
    openComponent,
    sendMessage: sendAgentTurn,
    status: chat.status,
  };
}
