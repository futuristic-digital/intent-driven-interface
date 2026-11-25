# Intent-Driven Interface

**Intent-Driven Interface (IDI) turns natural-language requests into focused interactions with React components.**

Instead of sending people to a page full of controls, IDI opens a component built for the task they asked for. If someone asks to see this month’s expenses, IDI can open the expenses component with its month filter already set to the current month. When a component produces a result, the app can pass it back to the model to continue the conversation.

Your app provides the components and controls what data it shares with the model. It can also let users reopen a component from chat history with its saved settings or pin those settings for quick access.

**[Visit the project homepage](https://www.intent-driven-interface.dev)**

---

## Add skills to your coding agent

IDI skills work with any coding agent that supports the [Agent Skills standard](https://agentskills.io/), including Codex, Claude Code, Cursor, GitHub Copilot, Gemini CLI, OpenCode, or Cline.

The `@intent-driven-interface/skill` dependency provides two skills:

- [`idi-setup`](packages/skill/idi-setup/SKILL.md): Connect IDI to your app and decide who can access it and what to persist.
- [`idi-components`](packages/skill/idi-components/SKILL.md): Create and maintain the React components IDI opens.

Install the package and register both skills with your coding agent:

```sh
npm install --save-dev @intent-driven-interface/skill
npx @intent-driven-interface/skill add-skills
```

Run these commands from your app's directory containing `package.json`.

Registration creates project-local symlinks to both skills in `node_modules`. Omit `--agent` to use `.agents/skills/`, or choose a destination explicitly:

- `--agent default` for the shared `.agents/skills/` directory (used by Codex, Cursor, Gemini CLI, OpenCode, and others)
- `--agent claude` for Claude Code (`.claude/skills/`)
- `--agent github` for GitHub Copilot (`.github/skills/`)
- `--agent cline` for Cline (`.cline/skills/`)

To register both skills in multiple directories at once, separate the names with commas:

```sh
npx @intent-driven-interface/skill add-skills --agent default, claude, github
```

*You should commit the symlinks so teammates only need to install dependencies, including dev dependencies. Dependency updates also update the skills. If your agent doesn't see the skills, check that each `SKILL.md` is readable through its symlink, then restart the agent session. Windows may require Developer Mode or elevated permissions for symlinks.*

---

## Set up IDI

**Your coding agent can set up IDI for you.** [Add skills to your coding agent](#add-skills-to-your-coding-agent), then ask it to integrate IDI into your app.

To set up IDI manually, use Node.js 22+ and React 19.2.4+ and install the IDI packages:

```sh
npm install @intent-driven-interface/frontend @intent-driven-interface/backend react@^19.2.4
```

*Your app owns authentication, storage, domain data, and the React UI. IDI manages the active conversation in the browser, streams model responses, and lets the model choose from the components your app registers.*

### 1. Create a server endpoint

Configure an `IDIAgent` on your server. This example uses your app’s authentication helper and an optional message store. If you don’t need to save chat history, omit the `messagesTable` import and the `onMessageUpdate` callback.

```ts
import { IDIAgent, gateway } from '@intent-driven-interface/backend';
import { getUserFromRequest } from './auth';
import { messagesTable } from './db';

export async function POST(request: Request): Promise<Response> {
  const user = await getUserFromRequest(request);
  if (!user) return new Response(null, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const agent = new IDIAgent({
    model: gateway('openai/gpt-oss-20b'),
    instructions: 'Be a kind, quick-witted guide. Help first, joke when it fits.',
    onMessageUpdate: (message) => messagesTable.upsert(user.id, message),
  });
  return agent.handleChatRequest(body);
}
```

#### Choose a `model`

**IDI requires a configured [AI SDK](https://ai-sdk.dev) model; we recommend to just configure as simply as the example above.**

**IDI doesn’t need a frontier model.** Its main job is to pick a component from the list your app registers and fill in its inputs, not build a UI from scratch. Prefer a small, fast model that makes reliable tool calls and keeps replies brief. [`gpt-oss-20b`](https://vercel.com/ai-gateway/models/openai/gpt-oss-20b) is our top pick for this job: it’s fast, inexpensive and well suited to a focused task. It’s open-weight: you can self-host it, or you can run it locally on a midrange machine with about 16 GB of memory available to the model.

The example above uses it through [Vercel AI Gateway](https://vercel.com/ai-gateway). To run the example, register to Vercel and [create a Gateway API key](https://vercel.com/docs/ai-gateway/authentication-and-byok/api-keys) and set it as the `AI_GATEWAY_API_KEY` environment variable on your server.

To use another provider or a locally hosted model, pass its AI SDK model instance as `model`. Set optional generation settings such as `temperature`, `reasoning`, `maxOutputTokens`, and `providerOptions` alongside `model`.

#### Customize the assistant with `instructions`

Add `instructions` to give the assistant a voice or app-specific guidance. IDI appends them to its built-in instructions.

#### Save chat history with `onMessageUpdate`

IDI calls `onMessageUpdate` when it receives a new user message, when the assistant finishes responding, and when the user edits or closes a component. Each call gives the complete message to the callback, not individual streamed tokens.

Use the message ID to insert or update the record in your app’s storage. If you omit the callback, chat still works, but messages cannot be restored across page reloads.

### 2. Create an IDI component

**Your coding agent can build and maintain IDI components for you.** [Add the IDI skills](#add-skills-to-your-coding-agent), then tell your agent what users should be able to see or do.

Say a user asks, “Show my expenses for April 2026.” The model can pick the `expenses` component and supply `{ month: '2026-04' }`, and your React component controls what the user sees. Use `defineIDIComponent` to describe that interaction:

```tsx
import { defineIDIComponent, schema } from '@intent-driven-interface/frontend';

export const expenses = defineIDIComponent({
  title: 'Show expenses',
  description: 'Show expenses for the requested month.',
  inputSchema: schema.object({
    month: schema
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .describe('Month in YYYY-MM format'),
  }),
  component: ({ componentInput }) => (
    <h2>Expenses for {componentInput.month}</h2>
  ),
  componentSummary: ({ componentInput }) => (
    <span>Expenses: {componentInput.month}</span>
  ),
});
```

**How does the model choose?** `title` and `description` tell it when to open the component. `inputSchema` tells it what to pass: here, a month in `YYYY-MM` format. For each component, IDI sends the tool definition to the server. Your React code stays in the browser.

**What does the user see?** While the expenses component is open, `component` renders its contents. Replace the `<h2>` with your app’s expense list, filtered by `componentInput.month`. After the component closes, `componentSummary` shows the selected month in the conversation.

`schema` re-exports Zod. Keep fields required for strict tool inputs; use `.nullable()` when a value can be unset rather than making it optional or giving it a default. Add `inputExamples` if a valid input would be hard to guess.

### 3. Create the component map

Register the components your chat can open. Each key is a component ID: `{ expenses }` registers the component from step 2 under the ID `expenses`.

```ts
import { defineComponentMap } from '@intent-driven-interface/frontend';
import { expenses } from './expenses';

export const components = defineComponentMap({ expenses });
```

Keep each ID stable. [Saved messages](#resume-a-chat) and [pins](#pin-a-component) use it to find the component, so you can change the display title without renaming the key.

### 4. Connect and render the conversation

Call `useIDI` inside your React chat component. It returns `messages` to render, `sendMessage` to send the user’s input, and `status` to track the response.

- Set `backend.url` to your `POST` endpoint (`/api/idi` in this example).
- Pass the [component map from step 3](#3-create-the-component-map) to `useIDI`.
- Render the live component while it’s open and its summary when `part.isClosed` is `true`.
- Show a loading indicator while `status` is `submitted` (new user message is just sent) or `streaming` (assistant message is composing and streaming).

```tsx
'use client';

import { useIDI } from '@intent-driven-interface/frontend';
import { components } from './components';

export function Chat() {
  const { messages, sendMessage, status, openComponent } = useIDI({
    backend: { url: '/api/idi' },
    components,
  });

  return (
    <>
      <ul>
        {messages.map((message) => (
          <li key={message.id} className={message.role === 'user' ? 'right' : 'left'}>
            {message.parts.map((part, index) => {
              // Text message
              if (part.type === 'text') return part.text;

              if (part.type === 'render-component') {
                // Component is live (last message in the chat flow): render the component
                if (!part.isClosed) return <part.component key={index} {...part.componentProps} />;

                // Component is closed (an entry in the chat history): show a compact summary inside a reopen button
                return (
                  <div key={index}>
                    <button
                      type="button"
                      aria-label={`Reopen '${components[part.componentId].title}' component`}
                      disabled={status === 'submitted' || status === 'streaming'}
                      onClick={() =>
                        openComponent(
                          part.componentId,
                          part.componentInput.override ?? part.componentInput.initial
                        )
                      }
                    >
                      <part.componentSummary {...part.componentProps} />
                    </button>
                  </div>
                );
              }

              // only text and component render supported in this example
              return null
            })}
          </li>
        ))}
      </ul>

      {/* Loading */}
      {(status === 'submitted' || status === 'streaming') && (
        <p role="status">Responding…</p>
      )}

      {/* Send new message (ask for a component) */}
      <form action={(data) => sendMessage(String(data.get('message')))}>
        <label>
          Message <input name="message" required />
        </label>
        <button type="submit">Send</button>
      </form>
    </>
  );
}
```

#### Reopen a component

The summary button opens a new instance of the same component at the end of the conversation without asking the model. The original summary stays in place. The new instance starts with the effective input (the override if present, otherwise the original input). For example, if the user changes the month from April to May, the original instance keeps April as initial and May as override. Reopening the component uses May as initial for the new instance. No override or output carries over.

---

## Component lifecycle

1. **Open.** A component opens for interaction only if the model ends its reply with a call to that component and the reply is still the latest message in the conversation. Use `part.isClosed` to decide whether to render `part.component` or `part.componentSummary`. A new message or an explicit close by the user sets `part.isClosed` to `true`. 
2. **Edit.** `componentInput` has two keys: `initial` is the original input, and `override` holds any edits made while the component is open. `setComponentInput` updates only `override`, so the model can distinguish the input it originally sent in response to the user’s request from what the user changed during the live interaction. If the component defines an `outputSchema`, use `setComponentOutput` to save a draft result.
3. **Close.** Call `closeComponent()` to finalize the draft, or `closeComponent({ setComponentOutput: output })` to supply a result as you close. If the server can’t save the final result, the component stays open and keeps the draft intact. Handle the rejection so the user can retry. Any model follow-up starts only after the save succeeds.
4. **Show the summary.** `componentSummary` receives the current input and optional final output. If you define an `outputSummary`, render it alongside the component summary. `part.componentOutput` holds the draft while the component is open and the final output once it closes.

Closing normally starts another model turn. The model sees the original input in the tool call, and the result contains `output` (the final outcome or `null`) plus `inputOverride` if the input changed. To close the component without starting another model turn, call `closeComponent({ agentFollowUp: false })`.

### Follow-up components

Use the `useOpenComponent` prop to open another registered component from the live component without asking the model. For example, give the expenses view a **Help** button that opens an `expenseHelp` component. Register `expenseHelp` alongside `expenses` in the component map; it needs no input.

In the `expenses` definition:

```tsx
component: ({ componentInput, useOpenComponent }) => {
  const openComponent = useOpenComponent<typeof components>();

  return (
    <>
      <h2>Expenses for {componentInput.month}</h2>
      <button
        type="button"
        onClick={() =>
          openComponent('expenseHelp', {}, { reopenThisComponentOnClose: true })
        }
      >
        Help
      </button>
    </>
  );
},
```

Give the help view a **Done** button that calls `closeComponent()`. When it closes successfully, IDI reopens expenses with the month the user was viewing, even if they changed it before opening help. No output or model turn is needed. Omit `reopenThisComponentOnClose` to use the normal close behavior instead.

### Control how components open

Set these flags in a component’s `defineIDIComponent` definition:

- `disableStandaloneOpen: true` blocks `openComponent(id, input)` from `useIDI`. **Useful when** users shouldn’t reopen a component from history or pins. For example, a deletion confirmation should appear only after the user clicks **Delete** on an item.
- `disableAgentOpen: true` prevents the model from opening the component. **Useful when** only your app knows the component is needed. For example, the app can open a save-conflict view when the server reports that someone else edited the record.

The flags work independently. Set both on a deletion confirmation so it can open from the item’s **Delete** button, but not through the agent or from chat history or pins.

---

## Chat history and pins

### Save a message

Use the server-side `onMessageUpdate` callback from the [endpoint example](#1-create-a-server-endpoint). Store the complete message it receives (`IDIMessageWire`), not the `IDIMessage` used for rendering. Insert or update by message ID within the authenticated user’s conversation, so editing or closing a component updates its existing message instead of adding a duplicate.

Return the write promise to wait for storage before acknowledging the update. If your server supports background work, you can schedule the write with your runtime’s `waitUntil` and return `void`. In that case, a `204` acknowledges the request, not a completed write. Your app is responsible for write ordering and retries.

### Resume a chat

Load the conversation’s messages in order and validate them with `idiMessagesSchema.safeParseAsync` from `@intent-driven-interface/backend/api-contracts`. Pass the validated messages to `useIDI` as `initialMessages`. The hook reads them when the chat mounts; it doesn’t fetch or paginate history. When switching chats, use the conversation ID as the chat component’s React `key` so it mounts with the right messages.

For a new chat, omit `initialMessages` to start empty, or use `defineInitialMessages` to supply a welcome message.

### Pin a component

A pin lets users reopen a component with saved inputs without finding the original message in chat history. Your app can save `part.componentId` and the effective input (`part.componentInput.override ?? part.componentInput.initial`). When the user selects the pin, pass those saved values to `openComponent(componentId, input)`. Hide pin and history reopen controls for components with `disableStandaloneOpen: true`. If a component’s input schema changes, your app is responsible for keeping its pins compatible.

## Supply request context

Use request context to give the model extra information, such as the browser's current time. On the server, import `schema` from `@intent-driven-interface/backend` and add this option to `new IDIAgent(...)`. Both IDI packages re-export their Zod dependency as `schema`, so no separate Zod install is needed.

```ts
contextSchema: schema.object({ currentTime: schema.iso.datetime() }),
```

On the client, add the matching option to `useIDI(...)`:

```ts
context: () => ({ currentTime: new Date().toISOString() }),
```

IDI calls the `context` callback for each generation request, including follow-ups triggered by closing a component. The server validates the returned context and passes it to the model as client data, not as system instructions. **Don't rely on client context for authorization or put secrets in it.**

Omit both options if you don't need context. A generation request returns `400` if context is sent without a schema or fails validation. Component-only updates don't send context.

## HTTP API

`useIDI` sends both strict JSON shapes to the same `backend.url` with the same `backend.requestHeaders`. Neither shape includes an `op` or `operation` field:

- **Generation:** POST `{ messages, componentMap, context? }` with a non-empty wire message array, serializable tool definitions, and optional JSON context validated against the agent's `contextSchema`. The response is an AI SDK UI message stream.
- **Update only:** POST `{ message }` with one complete assistant component message. No model runs. The endpoint returns `204` after the callback completes or as a no-op if the callback is omitted.

The endpoint returns `400` for an invalid body or generation context and `500` if the callback throws or rejects before a stream starts or on an update-only request. A stream already underway cannot change its HTTP status.

The browser-safe `@intent-driven-interface/backend/api-contracts` entry point exports `IDIMessageWire`, `ComponentMapForBackend`, and `IDIRequestBody`. It also exports `ComponentInput`, the `{ initial, override? }` type used by render parts, which is available from `@intent-driven-interface/backend` as well. Use `idiRequestBodySchema.safeParseAsync(body)` to validate either POST shape and `idiMessagesSchema.safeParseAsync(messages)` to validate wire messages at app boundaries, such as when reading stored history. The history schema accepts `[]`; generation requires at least one message. Message validation checks SDK parts and metadata without revalidating old component inputs or outputs against the current component map.

The backend package also exports the tool builder, shared default instructions, and context trimming. The `@intent-driven-interface/backend/trim-messages-for-agent` entry point exposes the shared 40-message model context window.

---

## License

[MIT](LICENSE)
