/** Bounded, process-local demo storage; idle or least-recently-used visitors expire. */
export function createVisitorStore<Value>(createValue: () => Value) {
  const entries = new Map<string, { value: Value; lastAccess: number }>();
  const maxVisitors = 200;
  const idleLifetimeMs = 24 * 60 * 60 * 1000;

  return (visitorId: string): Value => {
    const now = Date.now();
    for (const [id, entry] of entries) {
      if (now - entry.lastAccess >= idleLifetimeMs) entries.delete(id);
    }

    const existing = entries.get(visitorId);
    entries.delete(visitorId);
    const value = existing?.value ?? createValue();
    entries.set(visitorId, { value, lastAccess: now });

    if (entries.size > maxVisitors) {
      const oldestId = entries.keys().next().value;
      if (oldestId !== undefined) entries.delete(oldestId);
    }
    return value;
  };
}
