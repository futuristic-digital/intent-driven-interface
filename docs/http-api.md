# HTTP API

[`useIDI`](../README.md#4-connect-and-render-the-conversation) sends a `POST` to `backend.url` with `backend.requestHeaders` if configured. Your endpoint passes the parsed body to [`IDIAgent`](../README.md#1-create-a-server-endpoint) via `handleChatRequest`.

## Generate a reply

Send `{ messages, componentMap }` to start a model turn. The assistant can reply with text, open a component, or do both.

- **`messages`** is a non-empty list of conversation messages. It carries the new user message or a finalized component result, along with the conversation context.
- **`componentMap`** tells the agent which components it can open. It’s keyed by component ID and contains definitions such as descriptions and JSON schemas for inputs and optional outputs, not React components.

When the user closes a component with a result, IDI saves the result and, by default, sends a generation request so the assistant can respond without a new user message. To save the result without asking the assistant to reply, call `closeComponent({ agentFollowUp: false })`.

## Save a component change

Send `{ message }` to report a change without running the model. For example, when the user changes the week in an open selector, IDI sends the complete assistant message containing the selector and its updated input, not just the new week.

The endpoint passes the message to [`onMessageUpdate`](../README.md#save-chat-history-with-onmessageupdate) and returns `204 No Content` when the callback completes. If no callback is configured, it returns `204` without saving anything.

## Message timestamps

Read the ISO 8601 creation time as `message.timestamp` in `onMessageUpdate` and on the messages returned by `useIDI`. The model receives it too, so it can interpret phrases like “next week.”

The browser timestamps user messages when they’re sent. The server timestamps assistant replies when they start. If your app opens a component directly without asking the model, the browser timestamps that message too.

## HTTP Error codes

- **`400 Bad Request`** — IDI couldn’t read the body as `{ messages, componentMap }` to [generate a reply](#generate-a-reply) or `{ message }` to [save a component change](#save-a-component-change). For example, a generation request with `messages: []` is invalid. The response is `{ "error": "Invalid payload" }`.
- **`500 Internal Server Error`** — Your app’s `onMessageUpdate` callback failed while saving a new user message before the reply starts or while saving a component change. For example, this happens if the callback returns a database write that fails. The response is `{ "error": "Message update failed" }`.

Once a reply starts streaming, a later error can’t change its HTTP status.
