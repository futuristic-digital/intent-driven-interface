# Supply request context

Use request context to give the model extra information, such as the browser's current time. On the server, import `schema` from `@intent-driven-interface/backend` and add this option to `new IDIAgent(...)`. Both IDI packages re-export their Zod dependency as `schema`, so no separate Zod install is needed.

```ts
contextSchema: schema.object({ currentTime: schema.iso.datetime() }),
```

On the client, add the matching option to `useIDI(...)`:

```ts
context: () => ({ currentTime: new Date().toISOString() }),
```

IDI calls the `context` callback for each generation request, including follow-ups triggered by closing a component. The server validates the returned context and passes it to the model as client data, not as system instructions. **Don't rely on client context for authorization or put secrets in it.**

Omit both options if you don't need context. A [generation request](http-api.md#requests-and-responses) returns `400` if context is sent without a schema or fails validation. Component-only updates don't send context.
