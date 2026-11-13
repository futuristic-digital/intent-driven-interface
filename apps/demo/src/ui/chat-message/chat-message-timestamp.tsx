import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** Defer browser-local time until hydration so cached HTML stays consistent. */
export function ChatMessageTimestamp({ timestamp }: { timestamp: string }) {
  return useSyncExternalStore(
    subscribe,
    () => formatChatMessageTimestamp(timestamp),
    () => null
  );
}

const formatChatMessageTimestamp = (date: string) => {
  return date
    ? new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null;
};
