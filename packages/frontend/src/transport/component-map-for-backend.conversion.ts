import { componentMapSchema } from '@intent-driven-interface/backend/api-contracts';
import { zodSchema } from 'ai';

import { type ComponentMap } from '../component-map/define-component-map.js';

/**
 * Converts the frontend component map to wire-format JSON Schema for the IDI backend.
 *
 * Entries with `disableAgentOpen: true` are omitted.
 * Every input field must be required; nullable fields represent unset values.
 *
 * @param componentMap Host-app map from `defineComponentMap`.
 */
export const convertComponentMapForBackend = async (
  componentMap: ComponentMap
) => {
  const componentMapForBackend = new Map<string, unknown>();

  for (const [componentKey, component] of Object.entries(componentMap)) {
    if (component.disableAgentOpen) {
      continue;
    }

    const inputSchema = await zodSchema(component.inputSchema).jsonSchema;
    const outputSchema = component.outputSchema
      ? await zodSchema(component.outputSchema).jsonSchema
      : undefined;

    componentMapForBackend.set(componentKey, {
      title: component.title,
      description: component.description,
      inputExamples: component.inputExamples,
      inputSchema,
      outputSchema,
    });
  }

  return componentMapSchema.parse(Object.fromEntries(componentMapForBackend));
};
