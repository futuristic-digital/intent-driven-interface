import { jsonSchema, tool, type ToolSet } from 'ai';

import { type ComponentMapForBackend } from '../api-contracts.js';

/**
 * Turns a wire-format component map into AI SDK tool schemas.
 *
 * These tools have no `execute` — they describe UI components the model can
 * invoke. Results arrive later from the client via `closeComponent`.
 *
 * @param componentMap JSON Schema map from the frontend POST body.
 * @returns AI SDK `ToolSet` keyed by component id.
 */
export function buildToolsFromComponentMap(
  componentMap: ComponentMapForBackend
): ToolSet {
  return Object.fromEntries<ToolSet[string]>(
    Object.entries(componentMap).map(([componentKey, component]) => [
      componentKey,
      tool({
        title: component.title,
        description: component.description,
        inputExamples: component.inputExamples?.map((input) => ({ input })),
        inputSchema: jsonSchema(component.inputSchema),
        outputSchema: component.outputSchema
          ? jsonSchema(component.outputSchema)
          : undefined,
        strict: true,
      }),
    ])
  );
}
