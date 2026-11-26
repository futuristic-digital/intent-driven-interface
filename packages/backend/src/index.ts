export type {
  ComponentMapForBackend,
  IDIChatMessage,
  IDIRequestBody,
} from './api-contracts.js';
export { buildToolsFromComponentMap } from './generation/component-map-to-tools.conversion.js';
export { defaultAgentSettings } from './agent/default.instructions.js';
export {
  IDIAgent,
  type IDIAgentOptions,
  type OnMessageUpdate,
} from './agent/idi-agent.js';
export {
  trimMessagesForAgent,
  AGENT_CONTEXT_MAX_MESSAGES,
} from './trim-messages-for-agent.js';
export { gateway } from 'ai';
export { z as schema } from 'zod';
