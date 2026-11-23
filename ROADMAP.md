# IDI roadmap

1. **Provider-independent inference.** Define an inference interface for IDI and offer Vercel as an optional adapter.
2. **Offline mode.** Run inference, chat history, and pins entirely on-device after setup.
3. **Next-component recommendations.** Rank eligible components on-device using the user’s recent component transitions and host-defined defaults, then offer the best match as a shortcut when there’s enough evidence.
4. **ID masking.** Keep record IDs available to the host app and out of model requests, including follow-ups and restored history.
5. **Ready-to-use React components.** Ship animated transitions to compact cards, virtualized chat history that preserves scroll position, and a pinned-views sidebar.
