import { type IDIChatMessage } from '@intent-driven-interface/backend/api-contracts';
import {
  type ReasoningUIPart,
  type StepStartUIPart,
  type TextUIPart,
  type UIToolInvocation,
} from 'ai';

import { type ComponentMap } from '../component-map/define-component-map.js';
import {
  type ComponentRenderProps,
  type ComponentInputOf,
  type ComponentToolState,
} from '../component-map/define-idi-component.js';

/** Message with renderable parts for the host's chat UI. */
export type IDIRenderMessage<COMPONENT_MAP extends ComponentMap> = Pick<
  IDIChatMessage,
  'id' | 'role' | 'metadata'
> & {
  parts: Array<
    | StepStartUIPart
    | ReasoningUIPart
    | TextUIPart
    | ComponentRenderUIPart<COMPONENT_MAP>
  >;
};

export type ComponentRenderUIPart<
  COMPONENT_MAP extends ComponentMap,
  K extends Extract<keyof COMPONENT_MAP, string> = Extract<
    keyof COMPONENT_MAP,
    string
  >,
> = {
  type: 'render-component';
  componentId: K;
  toolState: ComponentToolState;
  /** Render the live view when true and the summary otherwise, independent of SDK tool state. */
  isLive: boolean;
  componentProps: ComponentRenderProps<COMPONENT_MAP[K]>;
  /** Current input: the full replacement if edited, otherwise the initial input. */
  componentInput: ComponentInputOf<COMPONENT_MAP[K]>;
  /** Original input for this invocation, unchanged by edits. */
  componentInputInitial: ComponentInputOf<COMPONENT_MAP[K]>;
  /** Draft while open; finalized output once closed. */
  componentOutput?: unknown;
  _toolCall: Omit<UIToolInvocation<COMPONENT_MAP[K]>, 'input'>;
} & COMPONENT_MAP[K];

export { type TextUIPart };
