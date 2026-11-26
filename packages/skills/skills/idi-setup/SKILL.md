---
name: idi-setup
description: Integrates Intent-Driven Interface into a React host app. Use when installing IDI, connecting an IDIAgent endpoint to useIDI, or changing the model, endpoint access, or chat persistence.
---

# Set up Intent-Driven Interface

Inspect the host's routes, auth, and storage first. Reuse what exists and ask about unresolved requirements rather than adding login or a database by default. Decide access and persistence separately: a private chat can be ephemeral.

- **Access:** For private chats, authenticate and authorize the requested chat before handing either POST shape to IDI. Derive user and chat scope from trusted host context, not message metadata; don't keep it in process globals. If access is intentionally public, agree on rate limits to control model costs.
- **Persistence:** Omit `onMessageUpdate` for ephemeral chats. If history must survive reloads, wire saving and loading together. The host owns storage, history loading, and pins.

## Wire the chat

1. **Install** `@intent-driven-interface/backend` and `@intent-driven-interface/frontend` in the host app. See [prerequisites and install command](../../dist/README.md#manual-setup).
2. **Configure the server.** Create an `IDIAgent` from `@intent-driven-interface/backend` with a configured AI SDK model instance. Prefer a small model that calls tools reliably. Keep credentials and app-specific `instructions` server-side; specify a time zone there if users ask about relative dates. See the [POST handler example](../../dist/README.md#1-create-a-server-endpoint) and [model configuration](../../dist/README.md#choose-a-model).
3. **Handle both POST shapes on one route.** Pass the parsed JSON body to `handleChatRequest(body)` and return its `Response` unchanged. `{ messages, componentMap }` streams a model reply using up to the latest 40 messages. `{ message }` carries a complete assistant message for a client-side component open, edit, or close and gets `204` without running the model, even in an ephemeral chat. If the host needs to inspect the body first, use `idiRequestBodySchema.safeParseAsync` from `@intent-driven-interface/backend/api-contracts`. See the [HTTP API](../../dist/docs/http-api.md#http-api).
4. **Connect the React client.** Use `idi-components` to author views and register them with stable IDs in `defineComponentMap`. Pass the map as `components` to `useIDI` with `backend.url` and any host-required `backend.requestHeaders` (shared by both POST shapes). Wire `sendMessage`, show pending replies using `status`, and render text plus live views or summaries according to `part.isLive`. Use the returned `error` for generation and update failures; `onError` only handles generation errors. See the [rendering example](../../dist/README.md#4-connect-and-render-the-conversation).

## Add persistence only when needed

- Bind `onMessageUpdate` to the authorized chat. Upsert the complete `IDIChatMessage` by message ID within that chat and preserve `message.metadata.timestamp`. Return the write promise if acknowledgment must confirm storage. A background write can fail after acknowledgment, so the host owns its ordering and retries. See [how saving works](../../dist/docs/chat-history-and-pins.md#save-a-message).
- Load and order the authorized history before creating the chat. Validate it with `idiMessagesSchema.safeParseAsync` from `@intent-driven-interface/backend/api-contracts` and pass it as `initialMessages`. `useIDI` does not fetch history or replace the current conversation when only `initialMessages` changes. See the [resume example](../../dist/docs/chat-history-and-pins.md#resume-a-chat).

If users need shortcuts, [store pins](../../dist/docs/chat-history-and-pins.md#pin-a-component) as component IDs and current inputs, not outputs. Respect [standalone-open restrictions](../../dist/docs/follow-up-components.md#control-how-components-open) for pins and history reopen actions.
