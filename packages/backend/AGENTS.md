Server half of IDI: one LLM turn per generation request and shared wire contracts.

## Agent skills

- Use `idi-setup` for IDI integration and configuration and `idi-components` for component authoring.
- If a skill is unavailable, check the host project's `@intent-driven-interface/skill` dependency and its `<skill-name>/SKILL.md` under `.agents/skills/` (Codex) or `.claude/skills/` (Claude Code).
- Report a missing dependency or broken registration and recommend [Add skills to your coding agent](https://github.com/futuristic-digital/intent-driven-interface#add-skills-to-your-coding-agent). Run those commands from the host project, not this dependency. If already installed, only registration is needed; if `node_modules` is missing, restore dependencies first.

## Core rules

- Keep tools without `execute`. Component output is user/UI state closed on the client via `closeComponent`.
- Define both strict POST shapes in browser-safe `./api-contracts` via `idiRequestBodySchema`: generation `{ messages, componentMap }` with non-empty messages, and update-only `{ message }` with a complete assistant component message. No operation field or separate endpoint. Use `idiMessagesSchema` for host-loaded history, including `[]`, without a current tool map.
- Keep the ISO 8601 creation time at `message.metadata.timestamp` in both POST bodies, SDK messages, callbacks, and saved history. Read it from there when building model input.
- Expose `OnMessageUpdate` from the backend and accept `onMessageUpdate?: (message: IDIChatMessage) => void | Promise<void>` only as an `IDIAgent` constructor option. For generation, call it with the newest user message before generation and the complete assistant message at successful stream end, not for tokens or replayed context.
- Update-only runs no model and returns `204` after the callback completes or as a no-op when omitted; no extra flags. Return `400` for invalid bodies and `500` for callback failure before streaming or on an update-only request.
- Project tool results for model context with optional `inputOverride` and final `output`; keep tool-call arguments and stored output unchanged.
- Keep assistant IDs stable across continuations and attach timestamp metadata to the UI message stream.
- Trim context with `trimMessagesForAgent` before `streamText`; do not invent a separate context window.
- Log with `@futuristic.digital/logger`: module logger + `logger.child(getTraceContext())` per request path.
- Hosts supply a configured AI SDK model instance. Do not add model presets, choose a provider, or read `process.env` here.

## Boundaries

- Never import from `apps/*` or `@intent-driven-interface/frontend`.
- App-specific system prompts belong in `new IDIAgent({ instructions })`, not in this package's defaults beyond the shared tool-use rules.
- User authentication, chat authorization for both POST shapes, and persistence stay in the host. Bind the callback to the authorized chat per request, never to process-global user state. Do not accept user identifiers in `IDIAgent`.
- Returning the write promise makes IDI wait. A request-scoped callback can call the runtime's `ctx.waitUntil(promise)` directly and return `void` to detach the write, not the HTTP roundtrip. Acknowledgment doesn't guarantee detached work wrote durably. The host owns detached write ordering, retries, and durability; don't assume promises survive disconnects.
