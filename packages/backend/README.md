# `@intent-driven-interface/backend`

Server orchestration for Intent-Driven Interface (IDI). Each request runs one AI SDK turn. Tools describe interactive components; they have no server-side `execute`. The frontend resumes the conversation after the user closes a component.

## Coding-agent setup

For coding-agent-assisted development, install and activate `@intent-driven-interface/skill`. It provides shared frontend/backend integration guidance and component-authoring rules.

Run from your application's directory containing `package.json`, not from inside `node_modules`:

```sh
npm install --save-dev @intent-driven-interface/skill
npx @intent-driven-interface/skill add-skill --agent codex
```

For Claude Code, use `--agent claude`. If the dependency is already installed, only run `add-skill`. This creates a symlink at `.agents/skills/intent-driven-interface` (Codex) or `.claude/skills/intent-driven-interface` (Claude Code); dependency updates keep its contents current. There is no install hook. If the skill is not discovered, check that the link's `SKILL.md` is readable and restart your agent session.

## Getting started

Use Node.js 22+. The package ships ESM JavaScript and TypeScript declarations.

```sh
npm install @intent-driven-interface/backend ai
```

Create an `IDIAgent` with host callbacks, then pass the parsed request body and a host-resolved user ID to `agent.handleChatRequest(body, userId)`. Return its `Response` unchanged so generation can stream.

Required callbacks:

- `saveMessages({ messages, userId })`: persist message snapshots by ID.
- `loadMessages(userId, { beforeTimestamp?, limit? }?)`: return `{ messages, hasOlderMessages }` for a bounded history page.
- `loadPinnedComponents(userId)`: return the current ordered `PinnedIDIComponent[]`.
- `pinComponent({ userId, componentId, componentInput, componentInputState? })`: persist the original input and optional edited input independently.

Callback types are exported as `IDIAgentSaveMessages`, `IDIAgentLoadMessages`, `IDIAgentLoadPinnedComponents`, and `IDIAgentPinComponent`. Pass `instructions` to append application guidance, and optionally override `model` and `providerOptions`. The default model uses AI Gateway; the host configures provider credentials and is responsible for model usage costs.

## Persistence scheduling

By default, generation awaits the inbound message save before starting the stream and awaits the assistant save in the SDK's `onEnd` callback. Explicit `save-message` and pin operations always await persistence.

Optionally provide `scheduleTask(task: Promise<void>): void` (`IDIAgentScheduleTask`) to register generation saves with a host-managed request-lifetime scheduler. The task is already running; the host must keep it alive and handle failures. No hosting-platform dependency is required. Consume or forward the response stream for its completion callback to run.

## API and wire compatibility

- The package root exports `IDIAgent`, its options and callback types, tool builders, default settings, and context trimming.
- `@intent-driven-interface/backend/api-contracts` exports shared wire contracts, including `IDIMessageWire`, `ComponentMapForBackend`, and `UIMessageMetadata`.
- `@intent-driven-interface/backend/trim-messages-for-agent` exposes the shared 40-message context window.

The wire operations remain `generate-response`, `save-message`, `load-message-history`, `list-pinned-components`, and `pin-component`. Callback renames do not change these operation strings.

Generation receives fresh browser time and timezone through `clientTimeContext`. Model tool results expose optional `componentInputState` and final `componentOutput` without changing original invocation input or persisted messages. Pins are canonicalized before the host callback, then the current pin list is returned to replace client state.
