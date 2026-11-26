import type { IDIChatMessage } from '@intent-driven-interface/backend/api-contracts';
import { useCallback, useRef, useState } from 'react';

import { type IDIBackend, postMessageUpdate } from './idi-backend.js';

export type NotifyMessageUpdate = (message: IDIChatMessage) => Promise<void>;

export function useMessageUpdates({ url, requestHeaders }: IDIBackend) {
  const pending = useRef(new Map<string, Promise<void>>());
  const [failure, setFailure] = useState<{ messageId: string; error: Error }>();

  const notifyMessageUpdate = useCallback<NotifyMessageUpdate>(
    async (message) => {
      const messageId = message.id;
      const publish = () => postMessageUpdate({ url, requestHeaders }, message);

      // A final snapshot must not overtake an earlier draft, even if that draft rejected.
      const previous = pending.current.get(messageId) ?? Promise.resolve();
      const update = previous.then(publish, publish);
      pending.current.set(messageId, update);
      try {
        await update;
        setFailure((last) =>
          last?.messageId === messageId ? undefined : last
        );
      } catch (cause) {
        const error =
          cause instanceof Error
            ? cause
            : new Error('Message update failed', { cause });
        setFailure({ messageId, error });
        throw error;
      } finally {
        if (pending.current.get(messageId) === update)
          pending.current.delete(messageId);
      }
    },
    [url, requestHeaders]
  );

  return { notifyMessageUpdate, updateError: failure?.error };
}
