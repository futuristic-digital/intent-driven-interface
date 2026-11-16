import { type ComponentMapForBackend } from '@intent-driven-interface/backend/api-contracts';
import { zodSchema } from 'ai';

import { type ComponentMap } from '../component-map/define-component-map.js';

/**
 * Converts the frontend component map to wire-format JSON Schema for the IDI backend.
 *
 * Entries with `followUpComponent: true` are omitted so the model cannot call them.
 * Every input field must be required; nullable fields represent unset values.
 *
 * @param componentMap Host-app map from `defineComponentMap`.
 */
export const convertComponentMapForBackend = async (
  componentMap: ComponentMap
) => {
  const componentMapForBackend: ComponentMapForBackend = {};

  for (const [componentKey, component] of Object.entries(componentMap)) {
    if (component.followUpComponent) {
      continue;
    }

    const inputSchema = await zodSchema(component.inputSchema).jsonSchema;
    const outputSchema = component.outputSchema
      ? await zodSchema(component.outputSchema).jsonSchema
      : undefined;

    componentMapForBackend[componentKey] = {
      title: component.title,
      description: component.description,
      inputExamples: component.inputExamples,
      inputSchema,
      outputSchema,
    };
  }

  return componentMapForBackend;
};
