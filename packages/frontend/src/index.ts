export { type IDIChatMessage } from '@intent-driven-interface/backend/api-contracts';
export { z as schema } from 'zod';

export { defineInitialMessages } from './chat/define-initial-messages.js';
export { defineComponentMap } from './component-map/define-component-map.js';
export {
  defineIDIComponent,
  type CloseComponentOptions,
  type ComponentAsTool,
  type ComponentInputOf,
  type ComponentRuntimeProps,
  type ComponentStateUpdate,
  type ComponentSummaryProps,
  type OpenComponent,
  type OpenComponentOptions,
} from './component-map/define-idi-component.js';
export {
  type ComponentRenderUIPart,
  type IDIRenderMessage,
  type TextUIPart,
} from './rendering/idi-render-message.js';
export { type IDIBackend } from './transport/idi-backend.js';
export { useIDI } from './use-idi.js';
