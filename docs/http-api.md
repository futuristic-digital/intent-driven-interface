# HTTP API

[`useIDI`](../README.md#4-connect-and-render-the-conversation) sends both POST shapes to `backend.url` with `backend.requestHeaders` if configured. Your endpoint passes the parsed JSON body to [`IDIAgent`](../README.md#1-create-a-server-endpoint) via `handleChatRequest`. If your endpoint needs to inspect the payload first, use `idiRequestBodySchema.safeParseAsync` from `@intent-driven-interface/backend/api-contracts`.

## Generate a reply

Send `{ messages, componentMap }` to start a model turn. A successful response is a `200 OK` stream, not a single JSON message. The assistant can reply with text, open a component, or do both.

- **`messages`** is a non-empty list of conversation messages. It carries the new user message or a finalized component result, along with recent conversation context. `useIDI` sends at most the latest 40 messages, and `IDIAgent` applies the same limit before calling the model. This does not truncate chat history in the UI or in host storage.
- **`componentMap`** tells the agent which components it can open. It’s keyed by component ID and contains definitions such as descriptions and JSON schemas for inputs and optional outputs, not React components. `useIDI` leaves out components with `disableAgentOpen: true`.

Calling `closeComponent()` first sends a [component update](#save-a-component-change). Once the endpoint acknowledges it, IDI normally requests a reply without a new user message. It skips that request when you pass `agentFollowUp: false` or the close [returns to the component that opened it](follow-up-components.md#open-a-component-from-another-component).

## Save a component change

Send `{ message }` to report a change without running the model. The message must be a complete, non-streaming assistant message with at least one component tool part (`tool-<componentId>`). IDI sends this shape for client-side opens, draft edits, and closes. For example, changing the week in a selector sends the entire message containing the selector and its updated input, not just the new week.

The endpoint passes the message to [`onMessageUpdate`](../README.md#save-chat-history-with-onmessageupdate) and returns `204 No Content` when the callback completes. If no callback is configured, it returns `204` without saving anything.

## Message timestamps

Every message carries its ISO 8601 creation time at `message.metadata.timestamp`.

Generation request:

```json
{
  "messages": [{
    "id": "user-1",
    "role": "user",
    "metadata": { "timestamp": "2026-04-01T09:00:00Z" },
    "parts": [{ "type": "text", "text": "Show me the tasks for today." }]
  }],
  "componentMap": {}
}
```

Component update request (the user changes the week in an open selector):

```json
{
  "message": {
    "id": "assistant-1",
    "role": "assistant",
    "metadata": { "timestamp": "2026-04-01T09:00:01Z" },
    "parts": [{
      "type": "tool-selectWeek",
      "toolCallId": "call-1",
      "state": "output-available",
      "input": { "weekOf": "2026-04-06" },
      "toolMetadata": { "componentInputState": { "weekOf": "2026-04-13" } }
    }]
  }
}
```

Preserve the original creation time when saving updates. IDI includes user and assistant timestamps in the model’s context so it can interpret phrases like “next week.”

The browser timestamps user messages and assistant messages created by client-side component opens. The server timestamps new assistant replies when they start. Continuing an existing assistant message keeps its original timestamp.

## HTTP Error codes

- **`400 Bad Request`** — IDI couldn’t read the body as `{ messages, componentMap }` to [generate a reply](#generate-a-reply) or `{ message }` to [save a component change](#save-a-component-change). For example, a generation request with `messages: []` is invalid. The response is `{ "error": "Invalid payload" }`.
- **`500 Internal Server Error`** — Your app’s `onMessageUpdate` callback failed while saving a new user message before the reply starts or while saving a component change. For example, this happens if the callback returns a database write that fails. The response is `{ "error": "Message update failed" }`.

Once a reply starts streaming, a later error can’t change its HTTP status.
