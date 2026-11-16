# IDI logistics demo

A Next.js logistics demo powered by the extracted Intent-Driven Interface framework. Ask to see shipments on a map or in a list, select a shipment, or update its details. The existing language picker and sign-out confirmation are simulated actions, not real translation or authentication.

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
