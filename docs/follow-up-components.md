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

Set these flags in a component’s `defineIDIComponent` definition:

- `disableStandaloneOpen: true` blocks standalone opening via `useIDI().openComponent()`, including from chat history or pins. Keep the component’s summary visible in history, but omit reopen and pin actions.
- `disableAgentOpen: true` keeps the component out of the model’s tool list.

The flags work independently. Neither prevents a component from being opened via `useOpenComponent()` inside another component.

- **Keep a summary without letting users reopen it.** Set `disableStandaloneOpen: true` on a one-time review. The model can still open the review, but once it closes, chat history shows only the summary, without **Reopen** or **Pin** actions.
- **Open from your app, not from the model.** Set `disableAgentOpen: true` on `expenseReceipts`. The agent can’t open it, but the [**View receipts** button](#open-a-component-from-another-component) still can. Users can also reopen it from history or pins.
- **Open only from another component.** Set both flags on a deletion confirmation. Use `useOpenComponent()` in the item component to open the confirmation from its **Delete** button. The model can’t open the confirmation directly, and users can’t reopen it from history or pins.
