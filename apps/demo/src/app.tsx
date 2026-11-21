'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { ChatMessages } from './ui/chat-message/chat-messages';
import { ChatHeader } from './ui/header';
import { ChatInput } from './ui/chat-input';
import { PinnedComponentsPanel } from './ui/pinned-components-panel';
import {
  useIDI,
  defineInitialMessages,
} from '@intent-driven-interface/frontend';
import type {
  ComponentInputSnapshot,
  PinnedIDIComponent,
} from '@intent-driven-interface/backend/api-contracts';
import { generateId } from 'ai';
import { componentMap } from './components/idi/component-map';
import { idiApiUrl } from './utils/api';

const idiBackend = { url: idiApiUrl, requestHeaders: {} };

function getPinKey(componentId: string, snapshot: ComponentInputSnapshot) {
  return JSON.stringify(
    [componentId, snapshot.componentInput, snapshot.componentInputState],
    (_key, value: unknown) => {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return value;
      }
      return Object.fromEntries(
        Object.entries(value).sort(([left], [right]) =>
          left.localeCompare(right)
        )
      );
    }
  );
}

const initialMessages = defineInitialMessages([
  {
    id: 'initial',
    role: 'assistant',
    text: 'Welcome! Manage your shipments by telling me what you need.\n\nYou can view shipments, update delivery details, choose a delivery slot, compare carriers, or notify a customer about a delay. I’ll prepare notification drafts for you to review and personalize before sending.\n\nType a request below or choose a suggestion to get started.',
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

export function App() {
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopViewport,
    getDesktopViewport,
    getServerViewport
  );
  const [pinnedComponents, setPinnedComponents] = useState<
    PinnedIDIComponent[]
  >([]);
  const [isSidebarOpenOnDesktop, setIsSidebarOpenOnDesktop] = useState(true);
  const [isSidebarOpenOnMobile, setIsSidebarOpenOnMobile] = useState(false);
  const isSidebarOpen = isDesktop
    ? isSidebarOpenOnDesktop
    : isSidebarOpenOnMobile;

  function toggleSidebar() {
    if (isDesktop) setIsSidebarOpenOnDesktop((open) => !open);
    else setIsSidebarOpenOnMobile((open) => !open);
  }

  function closeMobileSidebar() {
    setIsSidebarOpenOnMobile(false);
    if (!isDesktop)
      document.getElementById('pinned-components-toggle')?.focus();
  }
  const {
    messages,
    sendMessage,
    status,
    restoreComponent,

    isLoadingInitialMessages,
    hasOlderMessages,
    isLoadingOlderMessages,
    loadOlderMessages,
  } = useIDI({
    idiBackend,
    componentMap,
    initialMessages,
  });

  /** Reveal the new pin using the current viewport. */
  const handlePinComponent = async (
    componentId: string,
    snapshot: ComponentInputSnapshot
  ) => {
    const inputSnapshot = structuredClone(snapshot);
    const key = getPinKey(componentId, inputSnapshot);
    const id = generateId();
    setPinnedComponents((current) => {
      const existing = current.find(
        (pin) => getPinKey(pin.componentId, pin) === key
      );
      return [
        { ...inputSnapshot, id: existing?.id ?? id, componentId },
        ...current.filter((pin) => pin !== existing),
      ];
    });
    if (getDesktopViewport()) {
      setIsSidebarOpenOnDesktop(true);
    } else {
      // Move focus out of the chat before the mobile overlay makes it inert.
      document.getElementById('pinned-components-toggle')?.focus();
      setIsSidebarOpenOnMobile(true);
    }
  };

  const agentAnswerInProgress =
    status === 'streaming' || status === 'submitted';

  const handleSendMessage = useCallback(
    async (text: string) => await sendMessage(text),
    [sendMessage]
  );

  return (
    <main
      className="relative min-h-dvh bg-background"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isSidebarOpen) {
          if (isDesktop) setIsSidebarOpenOnDesktop(false);
          else closeMobileSidebar();
          document.getElementById('pinned-components-toggle')?.focus();
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
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />
        <div className="relative flex min-h-0 flex-1">
          <PinnedComponentsPanel
            pinnedComponents={pinnedComponents}
            restoreComponent={restoreComponent}
            isLoading={false}
            disabled={isLoadingInitialMessages || agentAnswerInProgress}
            isOpen={isSidebarOpen}
            isOpenOnDesktop={isSidebarOpenOnDesktop}
            isOpenOnMobile={isSidebarOpenOnMobile}
            onClose={closeMobileSidebar}
          />
          <div
            className="flex min-w-0 flex-1 flex-col"
            inert={!isDesktop && isSidebarOpenOnMobile}
          >
            {/* Chat Messages */}
            <div className="flex-1 overflow-hidden">
              <ChatMessages
                messages={messages}
                agentAnswerInProgress={
                  agentAnswerInProgress || isLoadingInitialMessages
                }
                restoreComponent={restoreComponent}
                pinComponent={handlePinComponent}
                hasOlderMessages={hasOlderMessages}
                isLoadingOlderMessages={isLoadingOlderMessages}
                loadOlderMessages={loadOlderMessages}
              />
            </div>

            {/* Chat Input */}
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={isLoadingInitialMessages || agentAnswerInProgress}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
