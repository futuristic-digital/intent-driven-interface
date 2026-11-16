# IDI logistics demo

A Next.js logistics demo powered by the extracted Intent-Driven Interface framework. Ask to see shipments on a map or in a list, select a shipment, update its details, choose a delivery slot, compare carriers, or draft a delay notification. Sign-out is simulated, not real authentication.

## Try the interactive components

- **Delivery slots:** “Choose a delivery slot for shp-1 next Friday afternoon.” Browse dates and choose a sample time window. Availability is weekdays from tomorrow, with times in Europe/Berlin.
- **Carrier comparison:** “Compare carriers for shp-1 delivering by next Thursday.” Compare three fictional EUR quotes by price, delivery date, and service level. Edit the deadline to see which quotes qualify; delivery estimates use calendar days, including weekends.

- **Notification composer:** “Let the customer know their delivery is delayed.” Select a shipment when prompted, choose a recipient and Email or SMS, then edit the AI-prepared draft. Review the final preview before choosing **Send notification**. The UI uses production-style wording; delivery remains simulated, with fixed contacts and no email or SMS provider connected.

These components let you confirm or cancel and return the result to the conversation. They do **not** book shipping, reserve capacity, or change shipment data. Edited dates, selections, and notification drafts are preserved when reopening history or pins. Reopened notifications always require a fresh preview before sending.

## Run locally

1. Install the repository's workspace dependencies from the root. The demo uses `packages/frontend` and `packages/backend`, AI SDK 7 (`ai ^7.0.156`), and the framework's `@ai-sdk/react` 4 integration.
2. Create `apps/demo/.env.local`:

   ```dotenv
   AI_GATEWAY_API_KEY=your_ai_gateway_key
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
   ```

3. From the repository root, run:

   ```sh
   npm run dev:demo
   ```

4. Open the URL printed by Next.js, normally `http://localhost:3000`.

Chat generation sends conversation and component data to AI Gateway and may incur model usage charges. Map views use Mapbox and its token. Use fictional data only.

## Pin and reopen components

Use the pin button beside a component's timestamp to save it in the left panel. Select a saved summary to reopen that component with its original inputs and any captured input changes. Different inputs can be saved as separate pins; pinning the same snapshot again moves it to the top.

The hamburger button toggles the panel, which starts open on desktop and closed on mobile. Pinning a component successfully opens the panel automatically. Pins share the temporary visitor storage described below.

## How it fits together

- `src/components/idi` registers the existing views with `defineIDIComponent`.
- `src/app.tsx` connects `useIDI` to `/api/idi`; history summaries can reopen the original invocation with its edited input state.
- `src/app/api/idi/route.ts` passes requests and the demo visitor ID to `IDIAgent`. The framework validates and dispatches all wire operations, including `load-message-history` and `list-pinned-components`.
- `src/server/idi/persistence.ts` supplies `saveMessages`, `loadMessages`, `loadPinnedComponents`, and `pinComponent`. Saves are awaited; no background scheduler or database is needed.
- `src/domain/shipment.ts` owns the shipment domain locally; the framework has no shipment-specific contracts.

See the [frontend API](../../packages/frontend/README.md) and [backend API](../../packages/backend/README.md) for lifecycle and wire contracts.

## Temporary visitor data

Middleware establishes an HTTP-only, same-site cookie before the page starts parallel history and pin requests. This is an anonymous demo partition, **not authentication**.

Each visitor retains at most 500 messages and 50 pins. History loads in pages of 50 (server maximum 100). Stores retain up to 200 visitors and expire visitors after 24 hours of inactivity. Shipment edits apply only to that visitor's fixed seed records.

All storage is process-local: data can disappear on eviction, server restart, or serverless instance changes. Different instances do not share data. This persistence is intentionally unsuitable for production accounts.

## Checks

Once workspace dependencies are installed, run from the repository root:

```sh
npm run type-check --workspace=demo
npm run lint --workspace=demo
```
