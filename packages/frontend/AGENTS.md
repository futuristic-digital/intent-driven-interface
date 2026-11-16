Browser half of IDI: `useIDI`, the typed component map, and conversion between chat messages and AI SDK wire format.

## Agent skill

- Use the `intent-driven-interface` skill for IDI integration and component authoring.
- If the skill is not available, check the host project's `@intent-driven-interface/skill` dependency and whether `.agents/skills/intent-driven-interface/SKILL.md` (Codex) or `.claude/skills/intent-driven-interface/SKILL.md` (Claude Code) is readable.
- Report a missing dependency or missing/broken registration and recommend the commands in [Coding-agent setup](README.md#coding-agent-setup). Run setup from the host project, never from this dependency's directory. If already installed, only registration is needed; if `node_modules` is missing, restore dependencies first.


## Core rules

- Keep `ComponentMapForBackend` conversion lossless for serializable schema fields; never put functions on the wire.
- Preserve the agent loop contract: `closeComponent` finalizes output state and posts updated messages unless `agentFollowUp: false` (or resuming a caller).
- Store original invocation input and optional input state separately. State remains absent until explicitly updated; live components and summaries receive only effective `componentInput` (`state ?? original`). Do not add component merge functions.
- Preserve tool input as the original invocation. `setComponentInputState` and `setComponentOutputState` persist editable state without an LLM turn. Closing moves draft output to final output and removes the draft.
- Explicit lifecycle closure is independent of the AI SDK tool status. Close displaced components before sending a user message or opening another component.
- Live components receive editable output state, never finalized `componentOutput`; closing replaces the live view with its summary.
- Summaries receive effective `componentInput` and optional final `componentOutput`. Pins and host restoration preserve original input plus optional input state internally.
- `followUpComponent: true` must strip the tool from the backend tool list — only `callComponent` may open it.
- Message conversion (`idi-message.conversion`, `ai-sdk-message.format`) must round-trip stored parts correctly.

## Boundaries

- Never import from `apps/*`.
- Do not put `IDIAgent`, DB access, or `streamText` here — those are `@intent-driven-interface/backend` responsibilities, with persistence injected by the host.
- Do not add app domain components; host apps define those and pass them into `defineComponentMap`.
- Auth headers/cookies stay in the host app route.

## What belongs here

- `useIDI` — transport to `idiBackend` (`url` + `requestHeaders`), `callComponent`, `restoreComponent`, `sendMessage`, `loadOlderMessages`, `hasOlderMessages`, `isLoadingInitialMessages`, `isLoadingOlderMessages`, `isLoadingPinnedComponents`, `pinnedComponents`, `pinComponent`. Restores history and pins on mount via `load-message-history` / `list-pinned-components`. Pins store separate original input and captured input state so summaries and reopening receive both. `pinComponent` replaces local pin state from the response list (same `componentId` may appear more than once when either input snapshot differs).
- `defineIDIComponent` / `defineComponentMap` — types and registration helpers.
- `defineInitialMessages` — static seed messages in AI SDK shape.
- Message types (`IDIMessage`, `ComponentRenderUIPart`) and `schema` (zod re-export).
