'use client';

import { idiMessagesSchema } from '@intent-driven-interface/backend/api-contracts';
import { useEffect, useRef, useState } from 'react';
import { App } from './app';
import { DemoAIAvailability } from './domain/demo-ai-context';
import { DemoShipmentsProvider } from './domain/demo-shipments';
import { Button } from './ui/button';
import {
  demoChatIdHeader,
  parseDemoChatId,
  demoIDIUrl,
  type DemoChatHistoryResponse,
} from './utils/api';
import {
  readBrowserStorage,
  writeBrowserStorage,
} from './utils/browser-storage';

const chatIdStorageKey = 'flowdock.demo.chat-id';

type ChatLoadState =
  | { status: 'loading' | 'error' }
  | ({ status: 'ready'; chatId: string } & DemoChatHistoryResponse);

async function loadChat(
  chatId: string,
  signal: AbortSignal
): Promise<DemoChatHistoryResponse> {
  const response = await fetch(demoIDIUrl, {
    headers: { [demoChatIdHeader]: chatId },
    signal,
  });
  if (!response.ok) throw new Error('Could not load demo chat');
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== 'object' ||
    !('aiAvailable' in data) ||
    typeof data.aiAvailable !== 'boolean' ||
    !('messages' in data)
  ) {
    throw new Error('Invalid demo chat response');
  }
  return {
    aiAvailable: data.aiAvailable,
    messages: await idiMessagesSchema.parseAsync(data.messages),
  };
}

/** Load host-owned history before mounting useIDI, which reads its seed only once. */
export function ChatWorkspace() {
  const session = useRef<string | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  const [chat, setChat] = useState<ChatLoadState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    async function restoreChat() {
      try {
        if (session.current === undefined) {
          session.current =
            parseDemoChatId(readBrowserStorage(chatIdStorageKey)) ??
            crypto.randomUUID();
          writeBrowserStorage(chatIdStorageKey, session.current);
        }
        const chatId = session.current;
        const history = await loadChat(
          chatId,
          AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)])
        );
        if (!controller.signal.aborted)
          setChat({ status: 'ready', chatId, ...history });
      } catch {
        if (!controller.signal.aborted) setChat({ status: 'error' });
      }
    }
    void restoreChat();
    return () => controller.abort();
  }, [attempt]);

  if (chat.status !== 'ready') {
    return (
      <main className="grid min-h-dvh place-items-center bg-background p-6 text-center">
        {chat.status === 'loading' ? (
          <p role="status" className="text-muted-foreground">
            Loading chat…
          </p>
        ) : (
          <div className="space-y-3">
            <p role="alert">Chat history couldn’t load.</p>
            <Button
              type="button"
              onClick={() => {
                setChat({ status: 'loading' });
                setAttempt((previous) => previous + 1);
              }}
            >
              Retry loading history
            </Button>
          </div>
        )}
      </main>
    );
  }

  return (
    <DemoAIAvailability value={chat.aiAvailable}>
      <DemoShipmentsProvider>
        <App chatId={chat.chatId} savedMessages={chat.messages} />
      </DemoShipmentsProvider>
    </DemoAIAvailability>
  );
}
