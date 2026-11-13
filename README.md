# Intent-driven interface

A logistics demo for an intent-driven interface: describe what you want in plain language and the app presents the relevant UI. It uses an AI agent to select interface components and includes shipment lists, details, updates, and maps.

## Project structure

- `apps/demo` – the single Next.js application, including the UI and API routes.
- `packages/uai-client` – client hook and component-map helpers.
- `packages/uai-shared` – shared domain types and schemas.

## Getting started

Requirements: Node.js 24 or newer, Node.js 22.13+ (22.x), or Node.js 20.19+ (20.x), and npm 9 or newer.

```bash
npm install
```

Create `apps/demo/.env.local` with your [Vercel AI Gateway](https://vercel.com/ai-gateway) key and public Mapbox token:

```bash
AI_GATEWAY_API_KEY=your_ai_gateway_key
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

Run the app from the repository root:

```bash
npm run dev:demo
```

Then open the URL printed by Next.js (normally `http://localhost:3000`). Shipment API routes run in the same app. Shipment data is held in memory per server instance and resets when that instance restarts. It is not shared between instances and is intended only for the demo.

## Deploying to Vercel

Set the project's Root Directory to `apps/demo`. Its `vercel.json` builds workspace dependencies before the Next.js app. Configure the same environment variables in Vercel's project settings.

## Other commands

- `npm run build:demo` – build the Next.js app and its workspace dependencies.
- `npm run lint` – lint the workspaces.
- `npm run type-check` – type-check the workspaces.
