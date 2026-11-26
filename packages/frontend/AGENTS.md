This package owns browser transport, component lifecycle state, and the conversion of chat messages into renderable parts.

- Import wire contracts from `@intent-driven-interface/backend/api-contracts`, not the backend root. Preserve serializable schema fields when converting the component map; leave functions out of the payload.
- Send browser-originated component changes as complete assistant messages with stable IDs, using the same endpoint and headers as generation. Do not echo streamed responses or replayed history as updates.
- Keep the original invocation input separate from editable input, and draft output separate from final output. Editing either draft must not start a model turn; summaries read only final output.
- Do not infer component closure from SDK tool status or expose live actions while the assistant is streaming. On explicit close, wait for acknowledgment before showing the summary. If the update fails, keep the view and draft open and skip the follow-up.
- Enforce standalone-open restrictions in `useIDI().openComponent()`, not in the shared append path used by component-to-component opens.
