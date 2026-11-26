'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ChatMessages,
  type ChatMessagesHandle,
} from './ui/chat-message/chat-messages';
import { ChatHeader } from './ui/header';
import { ChatInput } from './ui/chat-input';
import { PinnedComponentsPanel } from './ui/pinned-components-panel';
import {
  useIDI,
  defineInitialMessages,
  type IDIChatMessage,
} from '@intent-driven-interface/frontend';
import { componentMap } from './components/idi/component-map';
import {
  createDemoPin,
  maxDemoPins,
  readDemoPins,
  saveDemoPins,
  type PinDemoComponent,
} from './components/idi/pinned-component';
import { demoChatIdHeader, demoIDIUrl } from './utils/api';

const welcomeMessages = defineInitialMessages([
  {
    id: 'initial',
    role: 'assistant',
    text: 'Welcome to Flowdock. Ask the AI to compare carriers or draft a delay notice. All shipments and actions are simulated.',
  },
]);

const desktopQuery = '(min-width: 1024px)';

/** Match Tailwind's desktop breakpoint for panel accessibility and toggle behavior. */
function subscribeToDesktopViewport(onChange: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const getDesktopViewport = () => window.matchMedia(desktopQuery).matches;
const getServerViewport = () => false;

export function App({
  chatId,
  savedMessages,
}: {
  chatId: string;
  savedMessages: IDIChatMessage[];
}) {
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopViewport,
    getDesktopViewport,
    getServerViewport
  );
  const [pinnedComponents, setPinnedComponents] = useState(readDemoPins);
  useEffect(() => saveDemoPins(pinnedComponents), [pinnedComponents]);
  const pinnedIds = useMemo(
    () => new Set(pinnedComponents.map(({ id }) => id)),
    [pinnedComponents]
  );
  const sidebarId = useId();
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  const [isSidebarOpenOnDesktop, setIsSidebarOpenOnDesktop] = useState(true);
  const [isSidebarOpenOnMobile, setIsSidebarOpenOnMobile] = useState(false);
  const isMobileSidebarOpen = !isDesktop && isSidebarOpenOnMobile;
  const isSidebarOpen = isDesktop ? isSidebarOpenOnDesktop : isMobileSidebarOpen;

  function toggleSidebar() {
    if (isDesktop) setIsSidebarOpenOnDesktop((open) => !open);
    else setIsSidebarOpenOnMobile((open) => !open);
  }

  function closeMobileSidebar() {
    setIsSidebarOpenOnMobile(false);
    if (!isDesktop) sidebarToggleRef.current?.focus();
  }
  const backend = useMemo(
    () => ({
      url: demoIDIUrl,
      requestHeaders: { [demoChatIdHeader]: chatId },
    }),
    [chatId]
  );
  const { messages, error, sendMessage, status, openComponent } = useIDI({
    id: chatId,
    backend,
    components: componentMap,
    initialMessages: savedMessages.length ? savedMessages : welcomeMessages,
  });

  /** Reveal the new pin using the current viewport. */
  const handlePinComponent: PinDemoComponent = (
    componentId,
    componentInput
  ) => {
    const pin = createDemoPin(componentId, componentInput);
    setPinnedComponents((previous) =>
      [pin, ...previous.filter((entry) => entry.id !== pin.id)].slice(
        0,
        maxDemoPins
      )
    );
    if (getDesktopViewport()) {
      setIsSidebarOpenOnDesktop(true);
    } else {
      // Move focus out of the chat before the mobile overlay makes it inert.
      sidebarToggleRef.current?.focus();
      setIsSidebarOpenOnMobile(true);
    }
  };

  const agentAnswerInProgress =
    status === 'streaming' || status === 'submitted';
  const chatMessagesRef = useRef<ChatMessagesHandle>(null);

  const reopenComponent: typeof openComponent = (componentId, ...options) => {
    chatMessagesRef.current?.focusOnReopen(componentId);
    openComponent(componentId, ...options);
  };

  return (
    <main
      className="relative min-h-dvh bg-background"
      onKeyDown={(event) => {
        if (
          event.key !== 'Escape' ||
          event.defaultPrevented ||
          event.nativeEvent.isComposing ||
          !isSidebarOpen
        ) {
          return;
        }

        if (!isDesktop) {
          closeMobileSidebar();
        } else if (
          event.target === sidebarToggleRef.current ||
          (event.target instanceof Node &&
            sidebarRef.current?.contains(event.target))
        ) {
          setIsSidebarOpenOnDesktop(false);
          sidebarToggleRef.current?.focus();
        }
      }}
    >
      {/* Grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
        linear-gradient(to right, currentColor 1px, transparent 1px),
        linear-gradient(to bottom, currentColor 1px, transparent 1px)
      `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Glow orbs */}
      <div className="pointer-events-none fixed top-1/4 -left-32 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
      <div className="pointer-events-none fixed bottom-1/4 -right-32 h-64 w-64 rounded-full bg-accent/20 blur-[100px]" />

      {/* Chat Interface */}
      <div className="relative flex h-dvh flex-col overflow-hidden">
        <ChatHeader
          sidebarId={sidebarId}
          toggleRef={sidebarToggleRef}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />
        <div className="relative flex min-h-0 flex-1">
          <PinnedComponentsPanel
            id={sidebarId}
            panelRef={sidebarRef}
            pinnedComponents={pinnedComponents}
            openComponent={reopenComponent}
            disabled={agentAnswerInProgress}
            isOpen={isSidebarOpen}
            isOpenOnDesktop={isSidebarOpenOnDesktop}
            isOpenOnMobile={isMobileSidebarOpen}
            onClose={closeMobileSidebar}
          />
          <div
            className="flex min-w-0 flex-1 flex-col"
            inert={isMobileSidebarOpen}
          >
            {/* Chat Messages */}
            <div className="min-h-0 flex-1 overflow-hidden">
              <ChatMessages
                ref={chatMessagesRef}
                messages={messages}
                agentAnswerInProgress={agentAnswerInProgress}
                generationFailed={status === 'error'}
                openComponent={reopenComponent}
                pinComponent={handlePinComponent}
                pinnedIds={pinnedIds}
              />
            </div>

            {/* Chat Input */}
            <ChatInput
              onSendMessage={(text) => {
                chatMessagesRef.current?.followLatest();
                return sendMessage(text);
              }}
              generationFailed={status === 'error'}
              updateFailed={Boolean(error) && status !== 'error'}
              disabled={agentAnswerInProgress}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
