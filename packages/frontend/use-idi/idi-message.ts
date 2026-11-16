import {
  type ReasoningUIPart,
  type StepStartUIPart,
  type TextUIPart,
  type UIToolInvocation,
} from 'ai';

import { type ComponentMap } from '../component-map/define-component-map';
import {
  type ComponentRenderProps,
  type ComponentCallInput,
  type ComponentInputOf,
  type ComponentToolState,
} from '../component-map/define-idi-component';

/** IDI messages used in the frontend and sent to the IDI backend. */
export type IDIMessage<COMPONENT_MAP extends ComponentMap> = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  /** ISO timestamp from message metadata; empty string if missing. */
  timestamp: string;
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
  /** Explicit lifecycle status, independent of SDK output availability. */
  isClosed: boolean;
  componentProps: ComponentRenderProps<COMPONENT_MAP[K]>;
  /** Original input and optional user state for host restoration and pinning. */
  inputSnapshot: ComponentCallInput<ComponentInputOf<COMPONENT_MAP[K]>>;
  /** Final output is available to summaries after closure, never to the live view. */
  componentOutput?: unknown;
  _toolCall: Omit<UIToolInvocation<COMPONENT_MAP[K]>, 'input'>;
} & COMPONENT_MAP[K];

export { type TextUIPart };
