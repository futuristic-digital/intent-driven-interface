# Intent-Driven Interface

**Intent-Driven Interface (IDI) turns natural-language requests into focused interactions with React components.**

Instead of sending people to a page full of controls, IDI opens a component built for the task they asked for. If someone asks to see this month’s expenses, IDI can open the expenses component with its month filter already set to the current month. When a component produces a result, the app can pass it back to the model to continue the conversation.

Your app provides the components and controls what data it shares with the model. It can also let users reopen a component from chat history with its saved settings or pin those settings for quick access.

**[Visit the project homepage](https://www.intent-driven-interface.dev)**

---

## Set up IDI

- **[Set up with a coding agent](#add-skills-to-your-coding-agent).** Register the IDI skills, then ask your agent to integrate IDI into your app.
- **[Set up manually](#manual-setup).** Connect a server endpoint, register a React component, and render it in chat.

## Add skills to your coding agent

IDI provides two skills for your coding agent:

- [`idi-setup`](packages/skill/idi-setup/SKILL.md) helps integrate IDI into your app.
- [`idi-components`](packages/skill/idi-components/SKILL.md) helps build the React components IDI opens.

From the directory containing your app’s `package.json`, install the skills package:

```sh
npm install --save-dev @intent-driven-interface/skill
```

Then register both skills with the command for your coding agent:

**Codex, Cursor, Gemini CLI, OpenCode, and other agents that read `.agents/skills/`:**

```sh
npx @intent-driven-interface/skill add-skills
```

**Claude Code:**

```sh
npx @intent-driven-interface/skill add-skills --agent claude
```

**GitHub Copilot:**

```sh
npx @intent-driven-interface/skill add-skills --agent github
```

**Cline:**

```sh
npx @intent-driven-interface/skill add-skills --agent cline
```

---

## Manual setup

Use Node.js 22+ and React 19.2.4+ and install the IDI packages:

```sh
npm install @intent-driven-interface/frontend @intent-driven-interface/backend react@^19.2.4
```

*Your app owns authentication, storage, domain data, and the React UI. IDI manages the active conversation in the browser, streams model responses, and lets the model choose from the components your app registers.*

### 1. Create a server endpoint

Configure an `IDIAgent` on your server.

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

IDI requires an [AI SDK](https://ai-sdk.dev) model. The example uses [Vercel AI Gateway](https://vercel.com/ai-gateway). To run it, [create a Gateway API key](https://vercel.com/docs/ai-gateway/authentication-and-byok/api-keys) and set `AI_GATEWAY_API_KEY` on your server.

**IDI doesn’t need a frontier model.** Its main job is to pick a component from the list your app registers and fill in its inputs, not build a UI from scratch. Prefer a small, fast model that makes reliable tool calls and keeps replies brief. [`gpt-oss-20b`](https://vercel.com/ai-gateway/models/openai/gpt-oss-20b) is our top pick for this job: it’s fast, inexpensive and well suited to a focused task. It’s open-weight: you can self-host it, or you can run it locally on a midrange machine with about 16 GB of memory available to the model.


To use another provider or a locally hosted model, pass its AI SDK model instance as `model`. Set optional generation settings such as `temperature`, `reasoning`, `maxOutputTokens`, and `providerOptions` alongside `model`.

#### Customize the assistant with `instructions`

Add `instructions` to give the assistant a voice or app-specific guidance. IDI appends them to its built-in instructions.

#### Save chat history with `onMessageUpdate`

IDI calls `onMessageUpdate` when it receives a new user message, when the assistant finishes responding, and when the user edits or closes a component. Each call gives the complete message, including its ISO 8601 creation time at `message.metadata.timestamp`.

Use the message ID to insert or update the record in your app’s storage, and preserve `message.metadata.timestamp` when restoring saved messages as `initialMessages`. If you omit the callback, chat still works, but messages cannot be restored across page reloads.

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

Keep each ID stable. [Saved messages](docs/chat-history-and-pins.md#resume-a-chat) and [pins](docs/chat-history-and-pins.md#pin-a-component) use it to find the component, so you can change the display title without renaming the key.

### 4. Connect and render the conversation

Call `useIDI` inside your React chat component. It returns `messages` to render, `sendMessage` to send the user’s input, and `status` to track the response.

- Set `backend.url` to your `POST` endpoint (`/api/idi` in this example).
- Pass the [component map from step 3](#3-create-the-component-map) to `useIDI`.
- Render the live component when `part.isLive` is `true` and its summary otherwise.
- Show a loading indicator while waiting for the reply (`submitted`) or receiving it (`streaming`).

```tsx
'use client';

import { useIDI } from '@intent-driven-interface/frontend';
import { components } from './components';

export function Chat() {
  const { messages, sendMessage, status } = useIDI({
    backend: { url: '/api/idi' },
    components,
  });

  return (
    <>
      <ul>
        {messages.map((message) => (
          <li key={message.id} className={message.role === 'user' ? 'right' : 'left'}>
            {message.parts.map((part, index) => {
              if (part.type === 'text') return part.text;
              if (part.type !== 'render-component') return null;

              // Component is live and interactive
              if (part.isLive) return <part.component key={index} {...part.componentProps} />;

              // Component is an entry in the chat history, show a compact summary
              const output = part.outputSchema?.safeParse(part.componentOutput);
              const summaryProps = {
                componentInput: part.componentInput,
                componentOutput: output?.success ? output.data : undefined,
              };
              return <part.componentSummary key={index} {...summaryProps} />;
            })}
          </li>
        ))}
      </ul>


      {(status === 'submitted' || status === 'streaming') && (
        <p role="status">Responding…</p>
      )}


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

To let users reopen a closed component, take `openComponent` from the same `useIDI` hook. Show this button beside the summary. If [`disableStandaloneOpen`](docs/follow-up-components.md#control-how-components-open) is set, show just the summary.

```tsx
...

const { messages, sendMessage, status, openComponent } = useIDI({
  backend: { url: '/api/idi' },
  components,
});

...
  
{!part.disableStandaloneOpen && (
  <button
    type="button"
    disabled={status === 'submitted' || status === 'streaming'}
    onClick={() => openComponent(part.componentId, part.componentInput)}
  >
    Reopen {part.title ?? part.componentId}
  </button>
)}

...
```

Reopening adds a new instance at the end of the chat without asking the model. The original summary stays in place. If the user changed the month from April to May, the new instance starts with May as its initial input. No override or output carries over.

---

## Component lifecycle

1. **Open.** Only the last part of the latest message can be a live, interactive component. The model can open a component by ending its reply with a call to it, or your app can open one directly with `openComponent`. Render the live view when `part.isLive` is `true` and its summary otherwise.
2. **Edit.** `part.componentInput` is the current input. It starts as the original input, and `setComponentInput` replaces it. `part.componentInputInitial` always keeps the original value. If the component defines an `outputSchema`, use `setComponentOutput` to save a draft result.
3. **Close.** Call `closeComponent()` to use the draft as the final result, or pass a new result with `closeComponent({ setComponentOutput: output })`.
4. **Show the summary.** `componentSummary` receives the current input and optional final output. If you define an `outputSummary`, render it alongside the component summary. `part.componentOutput` holds the draft while the component is open and the final output once it closes.

An explicit `closeComponent()` normally starts another model turn after acknowledgment, unless it [returns to the component that opened it](docs/follow-up-components.md#open-a-component-from-another-component). Sending a new message or opening another component also closes the current view, but that automatic close doesn’t request a separate follow-up. The model sees the original input in the tool call, and the result contains `output` (the final outcome or `null`) plus `inputOverride` if the input changed. To close the component without starting another model turn, call `closeComponent({ agentFollowUp: false })`.

---

## Guides and reference

- [Chat history and pins](docs/chat-history-and-pins.md) — Save and resume conversations and let users pin components.
- [Follow-up components](docs/follow-up-components.md) — Chain components and control how they can open.
- [HTTP API](docs/http-api.md) — See what starts a reply, what saves a component change, and which errors the endpoint returns.

---

## Roadmap

1. **Server-side component map.** Let the server pass the shared component map to `IDIAgent` at creation time so the browser doesn’t need to send component definitions on every turn.
2. **Context handling.** Design a context management system that selects relevant past messages and additional context from the host app, prioritizing what the model needs for each request within its context budget.
3. **Native offline mode.** Add built-in IDI support for running inference, accessing chat history, and managing pinned views entirely on-device after initial setup.
4. **Ready-to-use React components for IDI chat.** Ship animated transitions to compact cards, a virtualized chat history that preserves scroll position, and a sidebar for pinned views.
5. **Component migrations.** Version component input schemas so host apps can migrate saved inputs when reopening a component from chat history. Leave the original entry unchanged, and mark the component as unavailable if its inputs can’t be migrated.
6. **Component prefiltering.** Use vector search to rank only the components the host app makes available for the request by relevance to the prompt and conversation context. Send a bounded shortlist to the LLM alongside the prompt and context, so IDI can support catalogs with thousands of components without sending the full list on every request.
7. **Suggested follow-up messages.** Suggest what the user is most likely to say or ask next based on the conversation.

---

## License

[MIT](LICENSE)
