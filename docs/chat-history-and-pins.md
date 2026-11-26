# Chat history and pins

Your app owns storage for chat messages and pins. If you haven’t connected your chat yet, start with [Set up IDI](../README.md#set-up-idi).

## Save a message

Use the server-side [`onMessageUpdate` callback](../README.md#save-chat-history-with-onmessageupdate) to save the complete `IDIChatMessage`, including its original ISO 8601 creation time at `message.metadata.timestamp`. Insert or update by message ID so editing or closing a component updates the existing message instead of creating a duplicate.

Return the database write promise from `onMessageUpdate` if IDI should wait for storage. This makes a new user message wait for its write before generation starts, and a component update wait for its write before the endpoint acknowledges it.

If you schedule a background write instead, the endpoint can acknowledge an update before it’s stored. Use `waitUntil` or your runtime’s equivalent to keep the write running after the request ends; in this case a later write failure won’t reach the chat.

## Resume a chat

On page load, read the messages [saved by the server endpoint](../README.md#save-chat-history-with-onmessageupdate) and pass them as `initialMessages`.

```tsx
import { eq } from 'drizzle-orm';
import { idiMessagesSchema } from '@intent-driven-interface/backend/api-contracts';
import { Chat } from './chat';
import { db } from './db';
import { chatMessages } from './db/schema';

export async function SavedChat({ userId }: { userId: string }) {
  const rows = await db
    .select({ message: chatMessages.message })
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(chatMessages.sequence);

  const history = await idiMessagesSchema.safeParseAsync(rows.map(({ message }) => message));
  if (!history.success) throw new Error('Could not load saved chat messages');

  return <Chat initialMessages={history.data} />;
}
```

With no saved messages, the chat starts empty. For a new chat, you can also omit `initialMessages` or use `defineInitialMessages` to supply a welcome message. `useIDI` reads `initialMessages` when the chat mounts; it doesn’t fetch history.

## Pin a component

A pin lets users reopen a component without having to find the original message in chat history or ask the agent again to open it.

### Pin from the chat

To pin a chat component, save `part.componentId` and the current input (`part.componentInput`). Don’t offer pinning for components with `disableStandaloneOpen: true`.

```ts
// save-pin.ts
'use server';

import { getCurrentUser } from './auth';
import { db } from './db';
import { chatPins } from './db/schema';

export async function savePin(componentId: string, input: object): Promise<void> {
  const user = await getCurrentUser(); // Read the signed-in user from the server session.
  if (!user) throw new Error('Sign in to save a pin');

  await db.insert(chatPins).values({ userId: user.id, componentId, input });
}
```

Call `renderPinButton(part)` next to the component or its summary.

```tsx
function renderPinButton(part: {
  componentId: string;
  componentInput: object;
  disableStandaloneOpen?: boolean;
}) {
  if (part.disableStandaloneOpen) return null;

  return (
    <form action={() => savePin(part.componentId, part.componentInput)}>
      <button type="submit">Pin</button>
    </form>
  );
}
```

### Show and reopen pins

To reopen a pin, pass its saved component ID and input to `openComponent` from `useIDI`. IDI opens a new instance in the chat without a model turn.

In your client chat component, read pins for the signed-in user with your app’s `usePins()` hook. In this example the hook returns a list of `{ id, componentId, input }` records with registered component IDs. Skip components that no longer allow standalone opening or no longer accept the saved input.

```tsx
const pins = usePins();

const pinsList = (
  <ul>
    {pins.map(({ id, componentId, input }) => {
      const component = components[componentId];
      if (!component || component.disableStandaloneOpen) return null;

      const savedInput = component.inputSchema.safeParse(input);
      if (!savedInput.success) return null;

      const Summary = component.componentSummary;
      return (
        <li key={id}>
          <Summary componentInput={savedInput.data} />
          <button
            type="button"
            onClick={() => openComponent(componentId, savedInput.data)}
          >
            Reopen
          </button>
        </li>
      );
    })}
  </ul>
);
```
