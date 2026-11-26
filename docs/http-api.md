# HTTP API

This guide covers the HTTP contract between `useIDI` and `IDIAgent`. To connect them in your app, start with [Set up IDI](../README.md#set-up-idi).

## Requests and responses

`useIDI` sends both strict JSON shapes to the same `backend.url` with the same `backend.requestHeaders`. Neither shape includes an `op` or `operation` field:

- **Generation:** POST `{ messages, componentMap }` with a non-empty wire message array and serializable tool definitions. The response is an AI SDK UI message stream.
- **Update only:** POST `{ message }` with one complete assistant component message. No model runs. The endpoint returns `204` after the callback completes or as a no-op if the callback is omitted.

Every wire message must include its ISO creation time in `metadata.timestamp`. IDI includes user and assistant message timestamps in model input without changing the text shown in chat or passed to `onMessageUpdate`.

The endpoint returns `400` for an invalid body and `500` if the callback throws or rejects before a stream starts or on an update-only request. A stream already underway cannot change its HTTP status.

## Shared types and validation

The browser-safe `@intent-driven-interface/backend/api-contracts` entry point exports `IDIChatMessage`, `ComponentMapForBackend`, and `IDIRequestBody`. It also exports `ComponentInput`, the `{ initial, override? }` type used by render parts, which is available from `@intent-driven-interface/backend` as well. Use `idiRequestBodySchema.safeParseAsync(body)` to validate either POST shape and `idiMessagesSchema.safeParseAsync(messages)` to validate wire messages at app boundaries, such as when reading stored history. The history schema accepts `[]`; generation requires at least one message. Message validation checks SDK parts and metadata without revalidating old component inputs or outputs against the current component map.

The backend package also exports the tool builder, shared default instructions, and context trimming. The `@intent-driven-interface/backend/trim-messages-for-agent` entry point exposes the shared 40-message model context window.
