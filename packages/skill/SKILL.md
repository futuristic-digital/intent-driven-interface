---
name: intent-driven-interface
description: Authors IDI components, component maps, and IDIAgent routes using @intent-driven-interface/frontend and @intent-driven-interface/backend. Use when integrating Intent Driven Interface or its callback-based persistence.
---

# Intent Driven Interface

IDI lets a model open React components as tools. The user interacts with the UI; closing a component supplies its result for the next model turn. Tools have no server-side `execute`.

## Integration

- Register host-owned views with `defineIDIComponent` and `defineComponentMap` from `@intent-driven-interface/frontend`.
- Connect `useIDI({ componentMap, idiBackend: { url, requestHeaders } })` to the host's `/api/idi` route. Render the returned messages using their component render parts.
- Construct `IDIAgent` in the host with a named model preset or `model: { name: 'custom', model: configuredModel }`. Pass parsed request bodies and a host-authorized user ID to `handleChatRequest`; return its streaming response unchanged.
- Inject `saveMessages`, `loadMessages`, `loadPinnedComponents`, and `pinComponent`. Store message snapshots by ID, return bounded chronological history pages, and preserve original input separately from optional edited input state.
- Generation saves are awaited unless the host supplies `scheduleTask(task: Promise<void>): void`. The host owns background-task lifetime and error handling.
- Keep authentication, authorization, credentials, domain prompts, database schema, and persistence adapters in the host. Use the browser-safe `@intent-driven-interface/backend/api-contracts` subpath for wire contracts.

## Component authoring

- Describe what the user sees, which actions are available, when changes take effect, and which follow-up screens can open. Model-facing descriptions must match implemented behavior, not explain React plumbing.
- Put meaningful initial display choices in `inputSchema`. Strict tool inputs require every field: use nullable fields for unset values, not optional fields or defaults. Explain ambiguous enum semantics, relative dates, units, and ID selection in field descriptions.
- Add `inputExamples` only when they teach combinations the schema cannot explain clearly.
- Live views receive effective `componentInput`. `setComponentInputState` replaces the full editable input and persists it without an agent turn; original invocation input remains unchanged.
- Components with `outputSchema` receive editable `componentOutputState`. `setComponentOutputState` saves a draft without an agent turn. `closeComponent()` finalizes it; `closeComponent({ setComponentOutput: output })` sets and finalizes output atomically.
- Closing normally requests the next model turn, except with `agentFollowUp: false` or when resuming a caller. Sending a message or opening another component closes displaced components.
- `componentSummary` identifies the component and its effective input from the stored snapshot; do not refetch mutable data. Optional `outputSummary` displays the final outcome concisely.
- Set `followUpComponent: true` for views only another component may open through `callComponent`. These are hidden from the model's tool list.
- Restore history and pins with `restoreComponent`, preserving original input plus optional input state. Keep asynchronous layouts visually stable in the vertical conversation.

## Boundaries

Keep component-map schemas serializable. IDI is database-agnostic and has no component schema versioning or migrations. Hosts must avoid breaking stored payloads or handle incompatible data themselves.

For full contracts, read the installed `@intent-driven-interface/frontend` and `@intent-driven-interface/backend` package READMEs. For source and examples, see [the IDI repository](https://github.com/futuristic-digital/intent-driven-interface), especially `packages/frontend`, `packages/backend`, and `apps/demo`.
