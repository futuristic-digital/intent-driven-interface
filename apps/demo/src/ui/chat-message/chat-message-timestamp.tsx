import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const timestampFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Defer browser-local time until hydration so cached HTML stays consistent. */
export function ChatMessageTimestamp({ timestamp }: { timestamp: string }) {
  const label = useSyncExternalStore(
    subscribe,
    () => {
      const date = new Date(timestamp);
      return Number.isNaN(date.getTime())
        ? null
        : timestampFormatter.format(date);
    },
    () => null
  );
  return label === null ? null : <time dateTime={timestamp}>{label}</time>;
}
