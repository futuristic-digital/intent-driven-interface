# IDI logistics demo

A Next.js logistics demo powered by the extracted Intent-Driven Interface framework. Ask to see shipments on a map or in a list, select a shipment, update its details, choose a delivery slot, compare carriers, or draft a delay notification. Sign-out is simulated, not real authentication.

## Try the interactive components

- **Delivery slots:** “Choose a delivery slot for shp-1 next Friday afternoon.” Browse dates and choose a sample time window. Availability is weekdays from tomorrow, with times in Europe/Berlin.
- **Carrier comparison:** “Compare carriers for shp-1 delivering by next Thursday.” Compare three fictional EUR quotes by price, delivery date, and service level. Edit the deadline to see which quotes qualify; delivery estimates use calendar days, including weekends.

- **Notification composer:** “Let the customer know their delivery is delayed.” Select a shipment when prompted, choose a recipient and Email or SMS, then edit the AI-prepared draft. Review the final preview before choosing **Send notification**. The UI uses production-style wording; delivery remains simulated, with fixed contacts and no email or SMS provider connected.

These components let you confirm or cancel and return the result to the conversation. They do **not** book shipping, reserve capacity, or change shipment data. Edited dates, selections, and notification drafts are preserved when reopening history or pins. Reopened notifications always require a fresh preview before sending.

## Run locally

1. Install the repository's workspace dependencies from the root. The demo uses Next.js 16, `packages/frontend` and `packages/backend`, AI SDK 7 (`ai ^7.0.173`), and the framework's `@ai-sdk/react ^4.0.177` integration.
2. Create `apps/demo/.env.local`:

   ```dotenv
   AI_GATEWAY_API_KEY=your_ai_gateway_key
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
   ```

3. From the repository root, run:

   ```sh
   npm run dev:demo
   ```

4. Open `http://localhost:3000/demo`.

The root development command builds the IDI packages and watches their sources, so edits update the compiled workspace exports. Production builds also build package dependencies first.

Development and production builds explicitly use Webpack.

Chat generation sends conversation and component data to AI Gateway and may incur model usage charges. Map views use Mapbox and its token. Use fictional data only.

## Pin and reopen components

Use the pin button beside a component's timestamp to save it in the left panel. Select a saved summary to reopen that component with its original inputs and any captured input changes. Different inputs can be saved as separate pins; pinning the same snapshot again moves it to the top.

The hamburger button toggles the panel, which starts open on desktop and closed on mobile. Pinning a component successfully opens the panel automatically. Pins, chat history, and shipment edits live only in the open page. Refreshing starts a new chat and restores the original shipments.

## How it fits together

- `src/components/idi` registers the existing views with `defineIDIComponent`.
- `src/app.tsx` uses the standard `useIDI` hook for chat and keeps pins in page state.
- `src/app/api/idi/route.ts` delegates the standard IDI protocol to `IDIAgent`. Persistence requests are logged but store nothing; history and pin reads return empty lists. The route does not use cookies.
- `src/domain/demo-shipments.tsx` keeps shipment edits in React state shared by the demo's views.

See the [frontend API](../../packages/frontend/README.md) and [backend API](../../packages/backend/README.md) for lifecycle and wire contracts.


## Checks

Once workspace dependencies are installed, run from the repository root:

```sh
npm run type-check
npm run lint --workspace=demo
```
