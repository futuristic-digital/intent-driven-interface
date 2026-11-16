/**
 * Stable pin `inputs` for uniqueness and storage. Snapshot callers preserve
 * value types so original inputs and editable state still match their schemas.
 *
 * - Object keys are sorted; `undefined` entries are omitted (not valid on the wire).
 * - Explicit `null` is preserved — it is not the same as a missing key.
 * - Arrays keep element order; each element is canonicalized.
 * - Strings retain their types and exact values to match component schemas.
 * - Non-finite numbers are dropped; `-0` becomes `0`.
 */
export const canonicalizePinInputs = (
  inputs: Record<string, unknown>
): Record<string, unknown> => {
  const canonicalized = canonicalizeValue(inputs);
  if (
    canonicalized !== null &&
    typeof canonicalized === 'object' &&
    !Array.isArray(canonicalized)
  ) {
    return canonicalized as Record<string, unknown>;
  }
  return {};
};

const canonicalizeValue = (value: unknown): unknown => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return Object.is(value, -0) ? 0 : value;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeValue(item));
  }

  if (typeof value === 'object') {
    if (value instanceof Date) {
      return value.toISOString();
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, nested]) => [key, canonicalizeValue(nested)] as const)
        .filter((entry): entry is readonly [string, unknown] => {
          const [, nested] = entry;
          return nested !== undefined;
        })
        .sort(([left], [right]) => left.localeCompare(right))
    );
  }

  return undefined;
};
