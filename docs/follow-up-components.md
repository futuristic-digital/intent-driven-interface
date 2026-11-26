# Follow-up components

Once you’ve [registered your components](../README.md#3-create-the-component-map), you can open one from another and control which other paths can open it.

## Open a component from another component

Use `useOpenComponent` to open another registered component without asking the model. For example, add a **View receipts** button to the expenses view that opens receipts for the selected month. Register `expenseReceipts` alongside `expenses` with the same `{ month }` input schema.

In the `expenses` definition:

```tsx
component: ({ componentInput, useOpenComponent }) => {
  const openComponent = useOpenComponent<typeof components>();

  return (
    <>
      <h2>Expenses for {componentInput.month}</h2>
      <button
        type="button"
        onClick={() =>
          openComponent(
            'expenseReceipts',
            { month: componentInput.month },
            { reopenThisComponentOnClose: true }
          )
        }
      >
        View receipts
      </button>
    </>
  );
},
```

With `reopenThisComponentOnClose: true`, any successful `closeComponent` call from the receipts view automatically reopens expenses on the same month, with or without output. No separate back button or model turn is needed. Omit the option to use the [normal close behavior](../README.md#component-lifecycle).

## Control how components open

Set these flags in a component’s [`defineIDIComponent`](../README.md#2-create-an-idi-component) definition:

- `disableStandaloneOpen: true` blocks standalone opening via `useIDI().openComponent()`, including from chat history or pins. Keep the component’s summary visible in history, but omit reopen and pin actions.
- `disableAgentOpen: true` keeps the component out of the model’s tool list.

The flags work independently. Neither prevents a component from being opened via `useOpenComponent()` from inside another component.

### When to use each flag

- **Keep a summary in the history without letting users reopen it.** Set `disableStandaloneOpen: true` when a component should be used only once (e.g. reviewing a submitted form). The model can still open the component, but once it closes, chat history shows only the summary, without **Reopen** or **Pin** actions.
- **Let users open a component, but not the model.** Set `disableAgentOpen: true` when a component should open only in response to a user action, not at the agent’s initiative (e.g. modifying a selected entry from a list). Users can still reopen it from history or pins.
- **Open only from another component.** Set both flags to let open the component from another one (e.g. opening a confirmation dialog). The model can’t open it directly. After it closes, its summary still appears in chat history, but users can’t reopen it from history or pins.
