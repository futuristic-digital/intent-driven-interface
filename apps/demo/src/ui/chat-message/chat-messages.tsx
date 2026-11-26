import { useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react';
import type {
  OpenComponent,
  IDIRenderMessage,
} from '@intent-driven-interface/frontend';
import type { componentMap } from '../../components/idi/component-map';
import type { PinDemoComponent } from '../../components/idi/pinned-component';
import { TextMessageBubble } from './text-message-bubble';
import { RenderComponent } from './render-component';
import { TypingIndicator } from './typing-indicator';

type DemoComponentId = keyof typeof componentMap;

export type ChatMessagesHandle = {
  followLatest: () => void;
  focusOnReopen: (componentId: DemoComponentId) => void;
};

type ComponentReopenRequest = {
  componentId: DemoComponentId;
  previousMessageId: string | undefined;
};

export function ChatMessages({
  ref,
  messages,
  agentAnswerInProgress,
  generationFailed,
  openComponent,
  pinComponent,
  pinnedIds,
}: {
  ref: Ref<ChatMessagesHandle>;
  messages: IDIRenderMessage<typeof componentMap>[];
  agentAnswerInProgress: boolean;
  generationFailed: boolean;
  openComponent: OpenComponent<typeof componentMap>;
  pinComponent: PinDemoComponent;
  pinnedIds: ReadonlySet<string>;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const latestCardRef = useRef<HTMLDivElement>(null);
  const followLatestRef = useRef(true);
  const reopenRequestRef = useRef<ComponentReopenRequest | null>(null);

  const lastMessage = messages.at(-1);
  const lastMessageId = lastMessage?.id;
  const latestCard = lastMessage?.parts.find(
    (part) => part.type === 'render-component' && part.isLive
  );
  const latestComponentId =
    latestCard?.type === 'render-component' ? latestCard.componentId : undefined;
  const responseAvailable =
    !generationFailed &&
    messages.length > 1 &&
    lastMessage?.role === 'assistant' &&
    lastMessage.parts.some(
      (part) => part.type === 'text' || part.type === 'render-component'
    );

  useImperativeHandle(
    ref,
    (): ChatMessagesHandle => ({
      followLatest() {
        followLatestRef.current = true;
      },
      focusOnReopen(componentId) {
        reopenRequestRef.current = { componentId, previousMessageId: lastMessageId };
      },
    }),
    [lastMessageId]
  );

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    // Follow layout changes, not streamed tokens, and leave readers in place when they scroll up.
    const followContent = () => {
      if (followLatestRef.current) container.scrollTop = container.scrollHeight;
    };
    followContent();
    const observer = new ResizeObserver(followContent);
    observer.observe(content);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const request = reopenRequestRef.current;
    if (!request || request.previousMessageId === lastMessageId) return;
    reopenRequestRef.current = null;
    const card = latestCardRef.current;
    const container = scrollContainerRef.current;
    if (request.componentId !== latestComponentId || !card || !container) return;

    // A tall card's default focus scroll could land in the middle of the form.
    followLatestRef.current = false;
    card.focus({ preventScroll: true });
    container.scrollTop +=
      card.getBoundingClientRect().top - container.getBoundingClientRect().top - 8;
  }, [lastMessageId, latestComponentId]);

  return (
    <div
      ref={scrollContainerRef}
      role="region"
      aria-label="Messages"
      tabIndex={0}
      onFocus={(event) => {
        if (event.target !== event.currentTarget) followLatestRef.current = false;
      }}
      onScroll={(event) => {
        const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
        followLatestRef.current = scrollHeight - scrollTop - clientHeight <= 24;
      }}
      className="h-full overflow-y-auto px-4 py-6 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      <p role="status" className="sr-only">
        {agentAnswerInProgress
          ? 'Assistant is responding…'
          : responseAvailable
            ? 'New response in chat.'
            : ''}
      </p>
      <div ref={contentRef} className="mx-auto max-w-3xl space-y-6">
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
                  liveCardRef={part === latestCard ? latestCardRef : undefined}
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

        {agentAnswerInProgress && <TypingIndicator />}
      </div>
    </div>
  );
}
