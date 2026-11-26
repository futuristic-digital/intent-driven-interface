---
name: idi-components
description: Authors React components that Intent Driven Interface (IDI) opens in chat. Use when registering a component, writing its model-facing description or schemas, or deciding how edits, confirmation, summaries, follow-ups, and pins should work.
---

# Author IDI components

Start with one user intent: what should open, what can the user change, and what counts as done? Wrap the host's React view with `defineIDIComponent` from `@intent-driven-interface/frontend` and register it in the existing `defineComponentMap`. Keep the map key stable: history and pins use it, not the display title. Follow the [component example](../../dist/README.md#2-create-an-idi-component) and [registration example](../../dist/README.md#3-create-the-component-map). If the host has no IDI chat yet, use `idi-setup`.

## Design the model-facing contract

- Give the component an action-oriented `title`. In `description`, say when to open it, what the user sees or can do, and what requires confirmation. Distinguish opening a view from completing an action; describe only what the app implements.
- Use `schema.object` for serializable input. Include choices that shape the first view (filters, date, selected record), not fetched records or UI internals. Keep fields required for strict tool inputs; use `.nullable()` for an unset value, not an optional field or schema default. Describe formats, units, time zones, and what to pass when the user gives no preference. For an unknown record ID, accept `null` and let the user pick rather than asking the model to guess. Add `inputExamples` only for non-obvious combinations.

## Decide what survives the interaction

- **Settings worth reopening** (selected date, filter, editable text): use `componentInput`. `setComponentInput` replaces the whole object; use an updater that spreads the previous value for a field edit. Keep transient state such as focus, pending state, and review approval local so reopening never reuses approval.
- **A result worth recording** (confirmed selection, explicit cancellation): define an `outputSchema` that distinguishes the outcomes. Omit it for a display-only view. Use `setComponentOutput` only for drafts that can safely become final if a new message or component displaces the view. For confirmation-only results, build the output on confirmation and pass it to `closeComponent({ setComponentOutput: output })`.
- **Finish explicitly.** The host owns validation, authorization, and side effects; closing records the outcome but does not perform the domain action. Keep secrets out of input and output: both are conversation data. Await `closeComponent` and show a retryable error if the update fails. Use `agentFollowUp: false` when the summary is enough. See the [component lifecycle](../../dist/README.md#component-lifecycle) for close and follow-up behavior.

## Summarize and choose how it opens

- Make `componentSummary` a compact label based on the current input, without refetching mutable data. Use `outputSummary` for a readable final outcome, not a draft. In the chat renderer, use `part.isLive` to choose the live view. For a closed part with output, validate it with `part.outputSchema`, pass the result as `componentOutput` to `componentSummary`, and pass its fields as props to `outputSummary` if defined. See [rendering in chat](../../dist/README.md#4-connect-and-render-the-conversation).
- Use the injected `useOpenComponent()` for a user-driven next step without a model turn. Pass `reopenThisComponentOnClose: true` when an explicit close should return to the caller with its captured input and no prior output. Choose `disableAgentOpen` to hide the tool from the model and `disableStandaloneOpen` to block direct opens, including history and pins. Neither blocks opens from another component. See [chaining](../../dist/docs/follow-up-components.md#open-a-component-from-another-component) and [when to use each flag](../../dist/docs/follow-up-components.md#when-to-use-each-flag).
- Reopen eligible views with their component ID and **current** input, not the original arguments or output. Show saved pins only if the component still allows standalone opening and accepts the stored input. See [reopen from history](../../dist/README.md#reopen-a-component) and [show and reopen pins](../../dist/docs/chat-history-and-pins.md#show-and-reopen-pins).
