import 'server-only';

import { Buffer } from 'node:buffer';

import {
  idiMessagesSchema,
  type IDIChatMessage,
} from '@intent-driven-interface/backend/api-contracts';

const chatTtlMs = 60 * 60 * 1_000;
const maxChats = 128;
const maxMessagesPerChat = 64;
const maxChatBytes = 96 * 1024;
const maxMessageBytes = 32 * 1024;

type StoredMessage = {
  timestamp: string;
  createdAt: number;
  json: string;
  bytes: number;
};

type StoredChat = {
  expiresAt: number;
  messages: Map<string, StoredMessage>;
  bytes: number;
};

// This is intentionally one server process's memory, not shared or durable storage.
const chats = new Map<string, StoredChat>();

function pruneExpiredChats(now: number) {
  for (const [chatId, chat] of chats) {
    if (chat.expiresAt <= now) chats.delete(chatId);
  }
}

function chronologicalMessages(chat: StoredChat) {
  return [...chat.messages].sort(
    ([, first], [, second]) => first.createdAt - second.createdAt
  );
}

export function isDemoChatMessageWithinLimit(message: IDIChatMessage) {
  return Buffer.byteLength(JSON.stringify(message)) <= maxMessageBytes;
}

export function upsertDemoChatMessage(chatId: string, message: IDIChatMessage) {
  const now = Date.now();
  pruneExpiredChats(now);
  const chat = chats.get(chatId) ?? {
    expiresAt: now + chatTtlMs,
    messages: new Map<string, StoredMessage>(),
    bytes: 0,
  };
  const previous = chat.messages.get(message.id);
  const timestamp = previous?.timestamp ?? message.metadata.timestamp;
  const json = JSON.stringify({
    ...message,
    metadata: { ...message.metadata, timestamp },
  });
  const bytes = Buffer.byteLength(json);
  if (bytes > maxMessageBytes)
    throw new Error('Demo chat message exceeds storage limit');

  chat.messages.set(message.id, {
    timestamp,
    createdAt: Date.parse(timestamp),
    json,
    bytes,
  });
  chat.bytes += bytes - (previous?.bytes ?? 0);
  if (chat.messages.size > maxMessagesPerChat || chat.bytes > maxChatBytes) {
    for (const [messageId, oldest] of chronologicalMessages(chat)) {
      chat.messages.delete(messageId);
      chat.bytes -= oldest.bytes;
      if (
        chat.messages.size <= maxMessagesPerChat &&
        chat.bytes <= maxChatBytes
      )
        break;
    }
  }

  chat.expiresAt = now + chatTtlMs;
  chats.delete(chatId);
  chats.set(chatId, chat);
  if (chats.size > maxChats) {
    const oldestChatId = chats.keys().next().value;
    if (oldestChatId !== undefined) chats.delete(oldestChatId);
  }
}

export async function loadDemoChatMessages(chatId: string) {
  pruneExpiredChats(Date.now());
  const chat = chats.get(chatId);
  const messages = chat
    ? chronologicalMessages(chat).map(([, message]): unknown =>
        JSON.parse(message.json)
      )
    : [];
  return idiMessagesSchema.safeParseAsync(messages);
}
