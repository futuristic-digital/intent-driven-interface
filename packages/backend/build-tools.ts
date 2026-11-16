import { jsonSchema, tool, type ToolSet, type UIMessage } from 'ai';

import { type ComponentMapForBackend } from './api-contracts';

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
  const tools: ToolSet = {};

  for (const [componentKey, component] of Object.entries(componentMap)) {
    tools[componentKey] = tool({
      title: component.title,
      description: component.description,
      inputExamples: component.inputExamples,
      inputSchema: jsonSchema(component.inputSchema),
      outputSchema: component.outputSchema
        ? jsonSchema(component.outputSchema)
        : undefined,
      strict: true,
    });
  }

  return tools;
}

export type IDIChatRequestBody = {
  messages: UIMessage[];
  componentMap: ComponentMapForBackend;
};
