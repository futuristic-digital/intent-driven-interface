import { type AiSdkMessage } from './ai-sdk-message.format';

export type IDIBackend = {
  url: string;
  requestHeaders: HeadersInit;
};

/** Serialize saves per message so an older draft cannot overwrite finalized state. */
const pendingSaves = new Map<string, Promise<void>>();

/** Persists a message snapshot without requesting an agent turn. */
export const saveMessage = (
  idiBackend: IDIBackend,
  message: AiSdkMessage
): Promise<void> => {
  const key = `${idiBackend.url}:${message.id}`;
  const body = JSON.stringify({ operation: 'save-message', message });
  const pending = (pendingSaves.get(key) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const response = await fetch(idiBackend.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...idiBackend.requestHeaders,
        },
        body,
      });
      if (!response.ok) throw new Error('Unable to persist component state');
    });
  pendingSaves.set(key, pending);
  void pending
    .finally(() => {
      if (pendingSaves.get(key) === pending) pendingSaves.delete(key);
    })
    .catch(() => undefined);
  return pending;
};
