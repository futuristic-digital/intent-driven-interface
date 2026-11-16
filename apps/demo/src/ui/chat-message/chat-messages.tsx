import { useLayoutEffect, useRef } from 'react';
import type { ComponentInputSnapshot } from '@intent-driven-interface/backend/api-contracts';
import type {
  IDIMessage,
  RestoreComponent,
} from '@intent-driven-interface/frontend';
import { componentMap } from '../../components/idi/component-map';
import { TextMessageBubble } from './text-message-bubble';
import { RenderComponent } from './render-component';
import { TypingIndicator } from './typing-indicator';
import { Button } from '../button';

export function ChatMessages({
  messages,
  agentAnswerInProgress,
  restoreComponent,
  pinComponent,
  hasOlderMessages,
  isLoadingOlderMessages,
  loadOlderMessages,
}: {
  messages: IDIMessage<typeof componentMap>[];
  agentAnswerInProgress: boolean;
  restoreComponent: RestoreComponent<typeof componentMap>;
  pinComponent: (
    componentId: string,
    snapshot: ComponentInputSnapshot
  ) => Promise<void>;
  hasOlderMessages: boolean;
  isLoadingOlderMessages: boolean;
  loadOlderMessages: () => Promise<boolean>;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);


  const lastMessage = messages.at(-1);
  const latestContent = JSON.stringify({
    id: lastMessage?.id,
    parts: lastMessage?.parts.map((part) =>
      part.type === 'render-component'
        ? {
            componentId: part.componentId,
            isClosed: part.isClosed,
            toolState: part.toolState,
          }
        : part
    ),
    agentAnswerInProgress,
  });
  const previousHistoryRef = useRef({
    latestContent: '',
    firstId: messages[0]?.id,
    height: 0,
    count: 0,
    loadingOlder: false,
  });

  // Prepending history must keep the current reading position instead of jumping to the end.
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const previous = previousHistoryRef.current;
    const firstId = messages[0]?.id;
    const prepended =
      previous.firstId !== undefined &&
      previous.firstId !== firstId &&
      messages.length > previous.count;
    if (prepended) {
      container.scrollTop += container.scrollHeight - previous.height;
    } else if (
      !isLoadingOlderMessages &&
      !previous.loadingOlder &&
      previous.latestContent !== latestContent
    ) {
      // Scroll only the message list; scrollIntoView can also shift the app's ancestors.
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
    previousHistoryRef.current = {
      latestContent,
      firstId,
      height: container.scrollHeight,
      count: messages.length,
      loadingOlder: isLoadingOlderMessages,
    };
  }, [messages, latestContent, isLoadingOlderMessages]);

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {hasOlderMessages && (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isLoadingOlderMessages || agentAnswerInProgress}
              onClick={() => void loadOlderMessages()}
            >
              {isLoadingOlderMessages
                ? 'Loading history…'
                : 'Load older messages'}
            </Button>
          </div>
        )}
        {messages.map((message) =>
          message.parts.map((part, partIndex) => {
            if (part.type === 'text')
              // Text message
              return (
                <TextMessageBubble
                  key={`${message.id}-${partIndex}`}
                  isAssistant={message.role === 'assistant'}
                  timestamp={message.timestamp}
                  textPart={part}
                />
              );

            if (part.type === 'render-component') {
              // Render component message
              return (
                <RenderComponent
                  key={`${message.id}-${partIndex}`}
                  timestamp={message.timestamp}
                  renderComponentPart={part}
                  restoreComponent={restoreComponent}
                  pinComponent={pinComponent}
                  disabled={agentAnswerInProgress}
                />
              );
            }

            return null;
          })
        )}

        {agentAnswerInProgress && <TypingIndicator />}

      </div>
    </div>
  );
}
