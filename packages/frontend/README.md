# `@intent-driven-interface/frontend`

React bindings for Intent-Driven Interface (IDI). Your app registers and renders the React components; `useIDI` manages the conversation and sends requests to your IDI endpoint.

## Get started

Use Node.js 22+ and React 19.2.4+.

```sh
npm install @intent-driven-interface/frontend @intent-driven-interface/backend react@^19.2.4
```

1. Register components with `defineIDIComponent` and collect them with `defineComponentMap`.
2. In a client component, call `useIDI({ backend: { url: '/api/idi' }, components })` with your component map.
3. Render the `IDIRenderMessage` values in `messages`. For `render-component` parts, use the live view and `part.componentProps` while open, and the summary when `part.isClosed` is true. Use `sendMessage` to start a model turn or `openComponent(id, input)` to open a component directly.

See the [integration guide](https://github.com/futuristic-digital/intent-driven-interface#set-up-idi) for the server endpoint and a complete example.

## Control how components open

- `disableStandaloneOpen: true` makes `useIDI().openComponent()` log an error and do nothing, including when called from history or a bookmark.
- `disableAgentOpen: true` prevents the agent from opening the component.

The flags are independent. Neither affects `useOpenComponent()` inside another component. When opening another component that way, pass `{ reopenThisComponentOnClose: true }` to reopen the current component when the new one closes, even without output.

## Component input and output

- `part.componentInput` is a `ComponentInput<Input>` from `@intent-driven-interface/backend/api-contracts`: `{ initial, override? }`. The initial input is the original invocation. The optional override is a full replacement, not a patch.
- Live views and summaries receive effective `componentInput` (`override ?? initial`). Live views use `setComponentInput(inputOrUpdater)` to replace the override without starting a model turn or changing the original invocation.
- For components with an `outputSchema`, live `componentOutput` is the editable draft. Use `setComponentOutput(outputOrUpdater)` to update it, or pass `undefined` to clear it. This does not close the view or start a model turn.
- `part.componentOutput` is the draft while open and the final result once closed. Pass only finalized output to summaries.
- `closeComponent()` finalizes the draft. Use `closeComponent({ setComponentOutput: output })` to set the final result and close in one update. Explicit close waits for the server acknowledgment; if it fails, the view and its draft remain open. On success, IDI normally requests a model follow-up unless `agentFollowUp: false` or the close reopens the component that launched it.

## History and bookmarks

Your app owns history and bookmarks. Pass stored `IDIChatMessage` values to `useIDI` as `initialMessages`, or use `defineInitialMessages` to seed a new chat. The raw SDK metadata uses `componentInputState` and `componentOutputState`.

To reopen a component from history, call `openComponent(part.componentId, part.componentInput.override ?? part.componentInput.initial)`. This opens a fresh view without starting a model turn. The effective input becomes the new initial input, with no override or output carried over.

A bookmark can store the component ID and effective input. Open it with `openComponent(componentId, input)`. For components with `disableStandaloneOpen: true`, keep history summaries visible but omit reopen and bookmark actions.
