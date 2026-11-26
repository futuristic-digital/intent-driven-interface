Browser half of IDI: `useIDI`, the typed component map, and the conversion from chat messages to `IDIRenderMessage`.

## Agent skills

- Use `idi-setup` for IDI integration and configuration and `idi-components` for component authoring. The [root integration guide](https://github.com/futuristic-digital/intent-driven-interface#set-up-idi) is the canonical API reference.
- If a skill is unavailable, check the host project's `@intent-driven-interface/skill` dependency and its `<skill-name>/SKILL.md` under `.agents/skills/` (Codex) or `.claude/skills/` (Claude Code).
- Report a missing dependency or broken registration and recommend [Add skills to your coding agent](https://github.com/futuristic-digital/intent-driven-interface#add-skills-to-your-coding-agent). Run those commands from the host project, not this dependency. If already installed, only registration is needed; if `node_modules` is missing, restore dependencies first.

## Core rules

- Keep `ComponentMapForBackend` conversion lossless for serializable schema fields; never put functions on the wire.
- Do not expose live component actions before the assistant stream finishes. Explicit `closeComponent` awaits the update-only HTTP acknowledgment before replacing the view with its summary. Failure keeps the view and draft open and prevents a follow-up. On success, request a follow-up unless `agentFollowUp: false` or resuming a caller.
- Expose current input as `part.componentInput` and original invocation input as `part.componentInputInitial`. Live views and summaries receive current `componentInput`. `setComponentInput` replaces the whole current input without changing the initial input or starting a model turn.
- Reopen with `openComponent(part.componentId, part.componentInput)`. The current input becomes the new invocation's initial input; no output carries over.
- Keep raw SDK tool input and metadata fields `componentInputState` and `componentOutputState` unchanged. `setComponentOutput` edits the draft without a model turn. Live `componentOutput` is draft-only; `part.componentOutput` is draft while open and final once closed. Summaries receive only final output.
- Explicit lifecycle closure is independent of AI SDK tool status. Closing promotes the draft and removes it from metadata; `closeComponent({ setComponentOutput })` can supply the final result atomically. Close displaced components before sending a user message or opening another component.
- `disableAgentOpen` only controls the agent's tool list. Reject `disableStandaloneOpen: true` in `useIDI().openComponent()`, not in the shared append path.
- Browser-only calls, resumes, draft edits, and closes POST strict `{ message }` with a complete assistant `IDIChatMessage` containing a component and a stable ID. Use the same `backend.url` and `backend.requestHeaders` as generation, with no operation field. A no-op `204` is valid; don't treat acknowledgment as proof of persistence. Don't send separate updates for user messages, streamed tokens, completed model responses, or unchanged history.
- Preserve the ISO 8601 creation time at `message.metadata.timestamp` in both POST bodies, render messages, and `initialMessages`.
- `onMessageUpdate` is server-only. Never pass it to `useIDI` or import or export `OnMessageUpdate` in the frontend.

## Boundaries

- Never import from `apps/*`.
- Keep `IDIAgent` and model streaming in `@intent-driven-interface/backend`. Keep storage, history loading and pagination, and bookmark state in the host.
- Do not add app domain components; host apps define those and pass them into `defineComponentMap`.
- The host supplies any request headers and authenticates the user and authorizes chat access for both request shapes. Use the browser-safe `@intent-driven-interface/backend/api-contracts` entry point for wire contracts.

## What belongs here

- `useIDI` — generation and component update transport, lifecycle actions, and the `onError` callback. Generation sends `{ messages, componentMap }`. Initialize chat state from host-loaded `initialMessages`; do not fetch on mount.
- `defineIDIComponent` / `defineComponentMap` — types and registration helpers.
- `defineInitialMessages` — static seed messages in `IDIChatMessage` shape with `metadata.timestamp`.
- `IDIRenderMessage`, `ComponentRenderUIPart`, and re-exports of `IDIChatMessage` and `schema`.
