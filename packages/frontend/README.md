# `@intent-driven-interface/frontend`

React bindings for Intent-Driven Interface (IDI): typed component registration, `useIDI`, and AI SDK message conversion. The host renders the registered components; the hook manages conversation state and follow-up requests.

## Coding-agent setup

For coding-agent-assisted development, install and activate `@intent-driven-interface/skill`. It provides shared frontend/backend integration guidance and component-authoring rules.

Run from your application's directory containing `package.json`, not from inside `node_modules`:

```sh
npm install --save-dev @intent-driven-interface/skill
npx @intent-driven-interface/skill add-skill --agent codex
```

For Claude Code, use `--agent claude`. If the dependency is already installed, only run `add-skill`. This creates a symlink at `.agents/skills/intent-driven-interface` (Codex) or `.claude/skills/intent-driven-interface` (Claude Code); dependency updates keep its contents current. There is no install hook. If the skill is not discovered, check that the link's `SKILL.md` is readable and restart your agent session.

## Getting started

Use React 19.2.4+. The package ships ESM JavaScript and TypeScript declarations, preserving React client boundaries. Message and component-call IDs use the AI SDK's `generateId`.

```sh
npm install @intent-driven-interface/frontend @intent-driven-interface/backend ai react
```

1. Register views with `defineIDIComponent` and collect them with `defineComponentMap`.
2. Call `useIDI({ idiBackend: { url: "/api/idi", requestHeaders: {} }, componentMap })` inside a client component.
3. Render the returned `messages` and use `sendMessage` or `callComponent` to continue the conversation.

`IDIBackend` describes the endpoint and host-supplied request headers. `IDIMessage` describes renderable messages; `AiSdkMessage` describes their SDK representation. `schema` re-exports Zod, and `defineInitialMessages` creates seed messages used when no history exists.

## Component contract

Each component supplies an input schema, live view, and compact summary. Optional output schemas describe the user's final interaction. Input fields must be required for strict tool calling; use nullable fields for unset values rather than optional fields or defaults. Component maps are converted to JSON Schema before transmission.

- `componentInput` is the latest effective input: edited state when present, otherwise original invocation input.
- `setComponentInputState` replaces editable input without requesting an agent turn. Original invocation input never changes.
- `setComponentOutputState` persists an output draft without closing the view.
- `closeComponent()` finalizes the draft and normally requests the next agent turn. Use `closeComponent({ setComponentOutput: output, agentFollowUp: false })` to finalize explicitly without a follow-up.
- Summaries receive effective input and optional final output. Live views receive draft output, not final output.
- `followUpComponent: true` hides a component from the model while keeping it available to other components through `callComponent`.

## History and pins

`useIDI` loads history and pins on mount, supports `loadOlderMessages`, and exposes loading flags and `hasOlderMessages`. `pinComponent` replaces local pins with the backend's returned list. The same component can have multiple pins with different input snapshots.

Normal calls use `callComponent(id, input, options)`. Hosts restore snapshots through `restoreComponent(id, { componentInput, componentInputState })`. Original input and optional edited state remain separate; untouched components do not create an input-state copy. Closing or displacing a component preserves this distinction.

Generation sends fresh browser time and timezone. The wire operation strings remain `load-message-history` and `list-pinned-components`, matching the backend even though its host callbacks are named `loadMessages` and `loadPinnedComponents`.
