# Chat history and pins

Your app owns storage for chat messages and pins. If you haven’t connected your chat yet, start with [Set up IDI](../README.md#set-up-idi).

## Save a message

Use the server-side [`onMessageUpdate` callback](../README.md#save-chat-history-with-onmessageupdate) to save the complete `IDIChatMessage`. Insert or update by message ID so editing or closing a component updates the existing message instead of creating a duplicate.

*If you await the incoming message’s save in `onMessageUpdate` or return the write promise, IDI waits for the save before generating a response. To let the agent start responding sooner, start the save without awaiting it or returning its promise. If your runtime can stop background work when the request ends, don't forget to wrap the promise in `waitUntil` (or its equivalent).*

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

To pin a chat component, save `componentId` and the component’s current input (`componentInput.override ?? componentInput.initial`). Don’t offer pinning for components with `disableStandaloneOpen: true`.

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
  refresh();
}
```

Call `renderPinButton(part)` next to the component or its summary.

```tsx
function renderPinButton(part: {
  componentId: string;
  componentInput: { initial: object; override?: object };
  disableStandaloneOpen?: boolean;
}) {
  if (part.disableStandaloneOpen) return null;

  const input = part.componentInput.override ?? part.componentInput.initial;
  return (
    <form action={savePin(part.componentId, input)}>
      <button type="submit">Pin</button>
    </form>
  );
}
```

### Show and reopen pins

To reopen a pin, pass its saved component ID and input to `openComponent` from `useIDI`. IDI opens a new instance in the chat without a model turn.

Only show pins whose component is still registered, allows standalone opening, and accepts the saved input. Use the validated input for both the summary and reopening.

```tsx
const pins = await db
  .select({ id: chatPins.id, componentId: chatPins.componentId, input: chatPins.input })
  .from(chatPins)
  .where(eq(chatPins.userId, userId));

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
