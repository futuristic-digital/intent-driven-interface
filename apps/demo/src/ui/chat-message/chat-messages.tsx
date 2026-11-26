import { useLayoutEffect, useRef } from 'react';
import type {
  OpenComponent,
  IDIRenderMessage,
} from '@intent-driven-interface/frontend';
import type { componentMap } from '../../components/idi/component-map';
import type { PinDemoComponent } from '../../components/idi/pinned-component';
import { TextMessageBubble } from './text-message-bubble';
import { RenderComponent } from './render-component';
import { TypingIndicator } from './typing-indicator';

export function ChatMessages({
  messages,
  agentAnswerInProgress,
  openComponent,
  pinComponent,
  pinnedIds,
}: {
  messages: IDIRenderMessage<typeof componentMap>[];
  agentAnswerInProgress: boolean;
  openComponent: OpenComponent<typeof componentMap>;
  pinComponent: PinDemoComponent;
  pinnedIds: ReadonlySet<string>;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const lastMessage = messages.at(-1);
  const assistantReplied =
    messages.length > 1 &&
    lastMessage?.role === 'assistant' &&
    lastMessage.parts.some((part) => part.type === 'text');
  const latestContent = JSON.stringify({
    id: lastMessage?.id,
    parts: lastMessage?.parts.map((part) =>
      part.type === 'render-component'
        ? {
            componentId: part.componentId,
            isLive: part.isLive,
            toolState: part.toolState,
          }
        : part
    ),
    agentAnswerInProgress,
  });

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    // Scroll only the message list; scrollIntoView can also shift the app's ancestors.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    container.scrollTo({
      top: container.scrollHeight,
      behavior: reduceMotion.matches ? 'instant' : 'smooth',
    });
  }, [latestContent]);

  return (
    <div
      ref={scrollContainerRef}
      role="region"
      aria-label="Messages"
      tabIndex={0}
      className="h-full overflow-y-auto px-4 py-6 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.map((message) =>
          message.parts.map((part, partIndex) => {
            if (part.type === 'text')
              // Text message
              return (
                <TextMessageBubble
                  key={`${message.id}-${partIndex}`}
                  isAssistant={message.role === 'assistant'}
                  timestamp={message.metadata.timestamp}
                  textPart={part}
                />
              );

            if (part.type === 'render-component') {
              // Render component message
              return (
                <RenderComponent
                  key={`${message.id}-${partIndex}`}
                  timestamp={message.metadata.timestamp}
                  renderComponentPart={part}
                  openComponent={openComponent}
                  pinComponent={pinComponent}
                  pinnedIds={pinnedIds}
                  disabled={agentAnswerInProgress}
                />
              );
            }

            return null;
          })
        )}

        <p role="status" className="sr-only">
          {agentAnswerInProgress
            ? 'Assistant is responding…'
            : assistantReplied
              ? 'Assistant replied.'
              : ''}
        </p>
        {agentAnswerInProgress && <TypingIndicator />}
      </div>
    </div>
  );
}
