# Flowdock logistics demo

Flowdock is a Next.js demo of [Intent-Driven Interface](../../README.md). Ask for a logistics task in plain language, then work with the component that opens in chat. The demo uses fictional shipments and does not book deliveries, send notifications, or change an account.

## Run locally

From the repository root:

```sh
npm install
npm run dev:demo
```

Open [http://localhost:3000/demo](http://localhost:3000/demo). In development, use the Agentation toolbar in the bottom-right corner to annotate the UI and copy feedback.

To enable live AI and the map, set either or both variables in `apps/demo/.env.local`, then restart the demo:

```dotenv
AI_GATEWAY_API_KEY=your_ai_gateway_key
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

Live AI sends chat and component data to Vercel AI Gateway and may incur model charges. The demo limits generation per chat and per server process. Use fictional data only. If the map can’t load, the component shows the shipment list instead.

## Try the workflows

1. **Change a view and save a draft.** Ask “Show delayed shipments on a map,” switch the status or view, and write a **Dispatch note**. Close the card or open another component to save the note to the chat summary. The note never changes a shipment.
2. **Open a follow-up and return.** From a shipment row or map marker, choose **View details** and then **Back to shipments**. IDI restores the original view settings without calling the model. Details can only open from another component. **Update delivery details** also returns to the view after you confirm or cancel; it isn’t a model tool.
3. **Pin and reopen.** Pin a card after changing its settings. **Open again** uses the current settings from chat history; the pin uses the settings captured when you pinned it. Each opens a new card without bringing along the previous result. Refresh to restore saved chat and pins.
4. **Compare carriers or draft a delay notification.** Change the deadline to see which quotes qualify, or edit a message and review its final preview. Confirm or cancel to get a summary without a model turn. Reopening a notification restores the draft, not its approval.
5. **Try a model follow-up.** With live AI enabled, ask “Choose an afternoon delivery slot for shp-1 next Friday.” Confirm a sample slot to see the assistant respond to the result without a new prompt.
6. **Try a model-only component.** Ask “Sign me out.” This opens a simulated confirmation. Its summary stays in chat, but can’t be pinned or reopened.

## How it fits together

- `src/components/idi` defines the component map, input and output schemas, summaries, and rules for opening each view.
- `src/chat-workspace.tsx` loads saved history before passing it to `useIDI` as `initialMessages`. The browser keeps a random chat ID and input-only pins in local storage. The chat ID scopes the demo conversation; it is not account authentication.
- `src/app/api/idi/route.ts` routes generation and component updates to `IDIAgent`. `onMessageUpdate` saves each complete message by ID, preserving its original timestamp. The server can acknowledge updates without calling the model. The model resolves relative dates in Europe/Berlin.
- Demo chat history is bounded, held in one server process, and expires an hour after the last write. It isn’t shared across server instances and doesn’t survive a server restart. Shipment edits are held in the open page only.

See [chat history and pins](../../docs/chat-history-and-pins.md), [follow-up components](../../docs/follow-up-components.md), and the [HTTP API](../../docs/http-api.md).
