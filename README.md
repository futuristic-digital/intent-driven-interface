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
`http://localhost:3001`. The landing page shows a sample field-service workspace with a scripted
walkthrough. It uses no API keys or external requests.

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

4. Open `http://localhost:3000/demo`.

The demo posts to `/demo/api/idi`. Conversation and component data are sent to AI Gateway, which may incur model charges; maps use Mapbox. Use fictional data only. Chat history, pins, and shipment edits live only in the open page and reset when you refresh.

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

Package builds write JavaScript and declarations to each package's `dist/` directory. The frontend and backend `prepack` hooks build the packages and their workspace dependencies before packaging. Published packages include the MIT license.

## Deploy to Vercel

The root `vercel.json` uses [Vercel Services](https://vercel.com/docs/services) to deploy the landing page at `/` and the demo at `/demo` in one project.

1. Import the repository into Vercel and leave **Root Directory** at the repository root.
2. Set `AI_GATEWAY_API_KEY` and `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` in the project's environment variables for Production and any Preview deployments that need the demo.
3. Deploy the project.

## License

[MIT](LICENSE)
