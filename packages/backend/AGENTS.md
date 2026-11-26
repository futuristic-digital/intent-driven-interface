This package owns server-side generation and the wire contracts shared with the browser.

- Change request schemas in `./api-contracts`. Keep that entry point browser-safe and independent of the frontend package.
- Keep generation and update-only handling separate. An update must not invoke the model; await `onMessageUpdate` if provided before returning `204`.
- During generation, notify `onMessageUpdate` for the newest user message before the model runs and the complete assistant message after a successful stream. Do not notify for tokens or replayed history.
- Leave `execute` off component tools: the client, not the model loop, decides when a component is complete.
- Build model context without mutating stored tool arguments or results. Use `trimMessagesForAgent` before `streamText` and preserve assistant IDs and creation timestamps across continuations.
