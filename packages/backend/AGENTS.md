Server half of IDI: one LLM turn per request, wire types the frontend posts, and a host-injected persistence boundary. Tools describe UI components; they are not executed here.

## Agent skill

- Use the `intent-driven-interface` skill for IDI integration and component authoring.
- If the skill is not available, check the host project's `@intent-driven-interface/skill` dependency and whether `.agents/skills/intent-driven-interface/SKILL.md` (Codex) or `.claude/skills/intent-driven-interface/SKILL.md` (Claude Code) is readable.
- Report a missing dependency or missing/broken registration and recommend the commands in [Coding-agent setup](README.md#coding-agent-setup). Run setup from the host project, never from this dependency's directory. If already installed, only registration is needed; if `node_modules` is missing, restore dependencies first.


## Core rules

- Keep tools without `execute`. Component output is user/UI state closed on the client via `closeComponent`.
- `./api-contracts` — wire types (`ComponentMapForBackend`, `UIMessageMetadata`, `IDIMessageWire`) safe for client imports.
- Inject persistence via `IDIAgent` constructor deps (`saveMessages`, `loadMessages`, `loadPinnedComponents`, `pinComponent`). Never import a database client.
- Optional `scheduleTask` delegates generation saves to the host. Without it, await inbound persistence and return the final save promise from stream `onEnd`.
- Keep wire operations `load-message-history` and `list-pinned-components` unchanged despite the callback names.
- Project tool results for model context with optional user input state and final component output; keep tool-call arguments and stored output unchanged.
- `pin-component` canonicalizes original input and optional input state before persist (sorted keys and explicit `null` preserved; schema string/number distinctions retained), then host `pinComponent`, then returns `{ pinnedComponents }` from `loadPinnedComponents` so clients replace local state from the response (no client-side merge).
- Trim context with `trimMessagesForAgent` before `streamText`; do not invent a separate context window.
- Log with `@futuristic.digital/logger`: module logger + `logger.child(getTraceContext())` per request path.
- Do not read `process.env` here; apps that wrap routes own env and auth.

## Boundaries

- Never import from `apps/*` or `@intent-driven-interface/frontend`.
- App-specific system prompts belong in `new IDIAgent({ instructions })`, not in this package's defaults beyond the shared tool-use rules.
- Authn/authz stays in the host app route.
