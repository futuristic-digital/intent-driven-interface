- Pre-production: replace obsolete APIs and paths and update callers directly. Do not add compatibility shims, legacy fallbacks, or dual implementations.
- Document the current behavior only. Do not write migration guides, upgrade notes, or old-to-new examples unless I explicitly ask.

- Keep the framework host-agnostic. Auth, credentials, persistence adapters, domain components, and app-specific prompts belong in host apps. Use `apps/demo` as the integration example, not as a dependency of the packages. Keep `apps/landing` a scripted showcase without live service dependencies.

- Run workspace checks from the root with `npm run lint` and `npm run type-check`. Package consumers resolve `dist/`; use `npm run build:packages` to refresh those outputs for local consumption.
˝
