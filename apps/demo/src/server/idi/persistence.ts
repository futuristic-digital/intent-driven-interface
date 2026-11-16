import type {
  IDIAgentOptions,
  PinnedIDIComponent,
} from '@intent-driven-interface/backend';
import { z } from 'zod';
import { createVisitorStore } from '../visitor-store';

// Derive host callback and message shapes from the extracted backend contract.
type DemoPersistence = Pick<
  IDIAgentOptions,
  'saveMessages' | 'loadMessages' | 'loadPinnedComponents' | 'pinComponent'
>;
type Message = Parameters<
  DemoPersistence['saveMessages']
>[0]['messages'][number];
type StoredMessage = Message & { metadata: { timestamp: string } };
const messageMetadataSchema = z.object({ timestamp: z.iso.datetime() });
const maxMessages = 500;
const maxPins = 50;

const getVisitorState = createVisitorStore(() => ({
  messages: new Map<string, StoredMessage>(),
  pins: new Map<string, PinnedIDIComponent>(),
}));

/** IDI owns orchestration; the demo owns bounded, visitor-scoped persistence. */
export const demoPersistence: DemoPersistence = {
  async saveMessages({ userId, messages }) {
    const store = getVisitorState(userId);
    let latestTimestamp = Math.max(
      0,
      ...Array.from(store.messages.values(), (message) =>
        Date.parse(message.metadata.timestamp)
      )
    );

    for (const message of messages) {
      const existing = store.messages.get(message.id);
      const metadata = messageMetadataSchema.safeParse(message.metadata);
      // Unique creation times keep timestamp-only history cursors lossless.
      const createdAt = existing
        ? Date.parse(existing.metadata.timestamp)
        : Math.max(
            metadata.success ? Date.parse(metadata.data.timestamp) : Date.now(),
            latestTimestamp + 1
          );
      latestTimestamp = Math.max(latestTimestamp, createdAt);
      store.messages.set(
        message.id,
        structuredClone({
          ...message,
          metadata: { timestamp: new Date(createdAt).toISOString() },
        })
      );
    }

    const ordered = Array.from(store.messages.values()).sort((left, right) =>
      left.metadata.timestamp.localeCompare(right.metadata.timestamp)
    );
    for (const message of ordered.slice(
      0,
      Math.max(0, ordered.length - maxMessages)
    )) {
      store.messages.delete(message.id);
    }
  },

  async loadMessages(userId, options) {
    const limit = Math.min(100, Math.max(1, options?.limit ?? 50));
    const beforeTimestamp = options?.beforeTimestamp?.toISOString();
    const messages = Array.from(getVisitorState(userId).messages.values())
      .filter(
        (message) =>
          !beforeTimestamp || message.metadata.timestamp < beforeTimestamp
      )
      .sort((left, right) =>
        left.metadata.timestamp.localeCompare(right.metadata.timestamp)
      );
    return {
      messages: structuredClone(messages.slice(-limit)),
      hasOlderMessages: messages.length > limit,
    };
  },

  async loadPinnedComponents(userId) {
    return structuredClone(
      Array.from(getVisitorState(userId).pins.values()).reverse()
    );
  },

  async pinComponent({
    userId,
    componentId,
    componentInput,
    componentInputState,
  }) {
    const pins = getVisitorState(userId).pins;
    // The backend canonicalizes object keys; absence of edited state stays distinct.
    const key = JSON.stringify([
      componentId,
      componentInput,
      componentInputState,
    ]);
    const id = pins.get(key)?.id ?? crypto.randomUUID();
    pins.delete(key);
    pins.set(
      key,
      structuredClone({
        id,
        componentId,
        componentInput,
        ...(componentInputState === undefined ? {} : { componentInputState }),
      })
    );
    if (pins.size > maxPins) {
      const oldestKey = pins.keys().next().value;
      if (oldestKey !== undefined) pins.delete(oldestKey);
    }
  },
};
