# Intent Driven Interface

IDI lets an AI model open interactive React components instead of executing server-side tools. Users make choices in the UI, and those results drive the next conversation turn.

## Packages

- [`@intent-driven-interface/frontend`](packages/frontend/README.md) — `useIDI`, `defineIDIComponent`, component maps, lifecycle, history, and pins.
- [`@intent-driven-interface/backend`](packages/backend/README.md) — `IDIAgent`, one model turn per request, wire contracts, and host-injected persistence callbacks.
- [`apps/demo`](apps/demo/README.md) — a Next.js logistics example with shipment lists, maps, and editing.
- [`@intent-driven-interface/skill`](packages/skill/README.md) — agent instructions for component authoring and host integration.

IDI owns no database, authentication, or domain components. Hosts supply `saveMessages`, `loadMessages`, `loadPinnedComponents`, and `pinComponent`, plus an optional background-task scheduler. There is no component schema versioning or migration layer; hosts own compatibility with their stored data.

## Run the landing page

From the repository root, run `npm ci` and `npm run dev:landing`, then open
`http://localhost:3001`. The landing page uses a local sample delivery with no
API keys or external requests for the interactive example.

## Run the demo

Use Node.js 22.13+ and npm 11.11+.

1. Install workspace dependencies:

   ```sh
   npm ci
   ```

2. Create `apps/demo/.env.local`:

   ```dotenv
   AI_GATEWAY_API_KEY=your_ai_gateway_key
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
   ```

3. Start the app:

   ```sh
   npm run dev:demo
   ```

4. Open the URL printed by Next.js, normally `http://localhost:3000`.

The demo posts to `/api/idi`. Conversation and component data are sent to AI Gateway, which may incur model charges; maps use Mapbox. Use fictional data only. Visitor-scoped history, pins, and shipment edits are held in process memory and can disappear on restart or eviction. They are not shared between server instances.

## Use in a host application

Install the published packages:

```sh
npm install @intent-driven-interface/frontend @intent-driven-interface/backend
```

Both packages ship ESM JavaScript and TypeScript declarations. For local workspace or `file:` consumption, run `npm run build:packages` first; `npm run dev:demo` builds dependencies and watches package sources for changes.

Register a component map in the browser, connect `useIDI` to your route, and construct `IDIAgent` on the server with your persistence callbacks. Resolve and authorize the owner in the host route before passing its ID to the agent. See the package READMEs for the API.

## Add the agent skill

Install the skill as a development dependency, then register it with your coding agent:

```sh
npm install --save-dev @intent-driven-interface/skill
npx @intent-driven-interface/skill add-skill --agent codex
```

For Claude Code, use `--agent claude`. Registration creates a project-local symlink to the installed package, so dependency updates also update the skill. There is no `postinstall` script. See the [skill README](packages/skill/README.md) for details.

## Build and check

```sh
npm run build:packages
npm run lint
npm run type-check
npm run build:demo
```

Package builds write JavaScript and declarations to each package's `dist/` directory. `npm pack` and `npm publish` run the package's `prepack` hook, which builds it and its workspace dependencies before packaging. Only `dist/`, agent guidance, the README, and package metadata are published.

For Vercel, set the project root to `apps/demo` and configure the same environment variables. Its `vercel.json` builds the app and workspace dependencies.
