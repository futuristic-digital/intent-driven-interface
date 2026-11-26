import { type UIToolMetadata } from '@intent-driven-interface/backend/api-contracts';
import { type JSONType, z } from 'zod';

import { type ComponentMap } from '../component-map/define-component-map.js';
import { type ComponentStateUpdate } from '../component-map/define-idi-component.js';

const isSameDraftValue = (
  previous: JSONType | undefined,
  next: JSONType | undefined
): boolean => {
  if (previous === next) return true;
  if (
    !previous ||
    !next ||
    typeof previous !== 'object' ||
    typeof next !== 'object'
  ) {
    return false;
  }
  if (Array.isArray(previous)) {
    return (
      Array.isArray(next) &&
      previous.length === next.length &&
      previous.every((value, index) => isSameDraftValue(value, next[index]))
    );
  }
  if (Array.isArray(next)) return false;
  const entries = Object.entries(previous);
  return (
    entries.length === Object.keys(next).length &&
    entries.every(
      ([key, value]) =>
        Object.hasOwn(next, key) && isSameDraftValue(value, next[key])
    )
  );
};

/** Validates the replacement and preserves metadata identity if the draft is unchanged. */
export const updateInputDraft = (
  component: Pick<ComponentMap[string], 'inputSchema'>,
  metadata: UIToolMetadata,
  invocationInput: unknown,
  update: ComponentStateUpdate<object>
): UIToolMetadata => {
  const previous = component.inputSchema.parse(
    metadata.componentInputState ?? invocationInput
  );
  const next = typeof update === 'function' ? update(previous) : update;
  const value = z.json().parse(component.inputSchema.parse(next));
  if (isSameDraftValue(metadata.componentInputState, value)) return metadata;
  return { ...metadata, componentInputState: value };
};

/** Clears the draft on undefined, preserving metadata identity if unchanged. */
export const updateOutputDraft = (
  component: Pick<ComponentMap[string], 'outputSchema'>,
  metadata: UIToolMetadata,
  update: ComponentStateUpdate<object | undefined>
): UIToolMetadata => {
  const previous =
    metadata.componentOutputState === undefined
      ? undefined
      : component.outputSchema?.parse(metadata.componentOutputState);
  const next = typeof update === 'function' ? update(previous) : update;
  const value =
    next === undefined
      ? undefined
      : z.json().parse(component.outputSchema?.parse(next));
  if (isSameDraftValue(metadata.componentOutputState, value)) return metadata;

  const { componentOutputState: _previous, ...retainedMetadata } = metadata;
  return value === undefined
    ? retainedMetadata
    : { ...retainedMetadata, componentOutputState: value };
};
