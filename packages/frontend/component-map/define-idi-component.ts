import { type ZodType, z } from 'zod';

import { type ComponentMap } from './define-component-map.js';

export type ComponentToolState =
  'input-available' | 'input-streaming' | 'output-available';

/** A complete state replacement or an updater based on the latest saved state. */
export type ComponentStateUpdate<STATE> = STATE | ((previous: STATE) => STATE);

/** Closing may atomically replace the final output before ending the lifecycle. */
export type CloseComponentOptions<OUTPUT = undefined> = {
  agentFollowUp?: boolean;
} & ([OUTPUT] extends [undefined]
  ? { setComponentOutput?: never }
  : { setComponentOutput?: OUTPUT });

/** Live views and summaries receive only the latest effective input. */
export type ComponentSummaryProps<INPUT, OUTPUT> = {
  componentInput: INPUT;
} & ([OUTPUT] extends [undefined] ? unknown : { componentOutput?: OUTPUT });

/** Runtime actions never rewrite the original invocation or finalize output implicitly. */
export type ComponentRuntimeProps<INPUT, OUTPUT> = Pick<
  ComponentSummaryProps<INPUT, OUTPUT>,
  'componentInput'
> & {
  setComponentInputState: (update: ComponentStateUpdate<INPUT>) => void;
  closeComponent: (options?: CloseComponentOptions<OUTPUT>) => Promise<void>;
  useCallComponent: UseCallComponent;
} & ([OUTPUT] extends [undefined]
    ? unknown
    : {
        componentOutputState: OUTPUT | undefined;
        setComponentOutputState: (
          update: ComponentStateUpdate<OUTPUT | undefined>
        ) => void;
      });

/** Host-only restoration snapshot; state is absent until a user changes input. */
export type ComponentCallInput<INPUT> = {
  componentInput: INPUT;
  componentInputState?: INPUT;
};

/** Restores stored history/pins without exposing snapshots to live components. */
export type RestoreComponent<COMPONENT_MAP extends ComponentMap> = <
  K extends Extract<keyof COMPONENT_MAP, string>,
>(
  componentId: K,
  snapshot: ComponentCallInput<ComponentInputOf<COMPONENT_MAP[K]>>,
  options?: CallComponentOptions
) => void;

/** Options for {@link CallComponent} / `useCallComponent`. */
export type CallComponentOptions = {
  /**
   * When true (and called from inside a component via `useCallComponent`),
   * re-append the caller with its original input and latest input state after
   * the opened component closes.
   */
  resumeCallerAfterOutput?: boolean;
};

/**
 * Opens a registered component in the chat as a new assistant tool part.
 * Used by summaries / sidebar pins — does not call the LLM.
 */
export type CallComponent<COMPONENT_MAP extends ComponentMap> = <
  K extends Extract<keyof COMPONENT_MAP, string>,
>(
  componentId: K,
  ...options: IsEmptyObject<ComponentInputOf<COMPONENT_MAP[K]>> extends true
    ? [
        input?: ComponentInputOf<COMPONENT_MAP[K]>,
        options?: CallComponentOptions,
      ]
    : [
        input: ComponentInputOf<COMPONENT_MAP[K]>,
        options?: CallComponentOptions,
      ]
) => void;

type UseCallComponent = <
  COMPONENT_MAP extends ComponentMap,
>() => CallComponent<COMPONENT_MAP>;

export type ComponentAsTool<
  INPUT extends object,
  OUTPUT extends object | undefined = undefined,
> = {
  /**
   * Short tool name for the AI model's tool list (e.g. "Sign out").
   * Keep it clear and action-oriented so the model can distinguish this
   * component from similar ones.
   */
  title?: string;
  /**
   * Model-facing guide to when to open this UI, what it displays, and what
   * the user can do inside it. Explain saving/confirmation, follow-up screens,
   * and user-visible outcomes in domain language. Keep runtime state fields,
   * React APIs, and agent-loop mechanics out of the tool description.
   * Describe only implemented behavior; opening the UI does not imply its
   * actions have completed.
   */
  description?: string;
  /**
   * When true, omits this component from the backend agent tool list; only
   * callable via `callComponent` from another component.
   */
  followUpComponent?: boolean;
  /**
   * Serializable input the model passes when invoking this tool. Prefer a rich
   * schema: every display choice (labels, IDs, filters, pre-selections) should
   * live here so the agent can render the component in the user-desired shape
   * on the first turn.
   */
  inputSchema: ZodType<INPUT>;
  /**
   * Realistic input payloads that teach the model how to call this tool.
   * Especially useful when the schema has several fields or non-obvious shapes.
   */
  inputExamples?: INPUT[];
  /**
   * Shape of the user's final interaction — the outcome written by
   * `closeComponent` (which button, which option, confirm vs cancel).
   * This is the signal that may trigger a follow-up component or close the
   * current flow and start a new agent turn.
   */
  outputSchema?: ZodType<OUTPUT>;
  /**
   * Full interactive UI shown while this tool part is active in chat.
   * Receives the latest effective input and editable output state,
   * state setters, `closeComponent`, and `useCallComponent`.
   */
  component: React.ComponentType<ComponentRuntimeProps<INPUT, OUTPUT>>;
  /** History summaries receive effective input and optional finalized output. */
  componentSummary: React.ComponentType<ComponentSummaryProps<INPUT, OUTPUT>>;
  /**
   * Optional UI chip rendered below `componentSummary` when output exists.
   * Shows the user's final interaction visually (icon + short label), not raw
   * schema data.
   */
  outputSummary?: React.ComponentType<OUTPUT>;
};

export type ComponentDefinition<
  INPUT extends object,
  OUTPUT extends object | undefined = undefined,
> =
  IsEmptyObject<INPUT> extends true
    ? Omit<ComponentAsTool<INPUT, OUTPUT>, 'inputSchema'> & {
        inputSchema?: ZodType<INPUT>;
      }
    : ComponentAsTool<INPUT, OUTPUT>;

/**
 * Registers a React component as a IDI tool the agent can invoke.
 *
 * Field roles at a glance:
 * - `title` / `description` / `inputSchema` / `inputExamples` — wire-format
 *   tool definition for the model; keep descriptions concise and schemas rich.
 * - `component` — live interactive UI in chat.
 * - `componentSummary` — chat-history and sidebar pin pill; reflect the
 *   selected input values.
 * - `setComponentInputState` — persists editable input without changing the
 *   original invocation; pins and reopening use the latest state.
 * - `outputSchema` — user's final interaction written via `closeComponent`.
 * - `outputSummary` — visual rendering of that output below the summary pill.
 *
 * Host apps own the markup.
 */
export const defineIDIComponent = <
  INPUT extends object = object,
  OUTPUT extends object | undefined = undefined,
>(
  componentDefinition: ComponentDefinition<INPUT, OUTPUT>
): ComponentAsTool<INPUT, OUTPUT> =>
  ({
    ...componentDefinition,
    inputSchema: componentDefinition.inputSchema ?? z.object({} as INPUT),
  }) as ComponentAsTool<INPUT, OUTPUT>;

export type ComponentInputOf<
  T,
  InputParamsToBeOmitted extends string | number | symbol = never,
> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends ComponentAsTool<infer INPUT, any>
    ? Omit<INPUT, InputParamsToBeOmitted>
    : never;

/** Erased render boundary: schemas validate heterogeneous component payloads at runtime. */
export type ComponentRenderProps<T> = {
  componentInput: ComponentInputOf<T>;
  componentOutputState?: unknown;
  setComponentInputState: (update: ComponentStateUpdate<object>) => void;
  setComponentOutputState?: (
    update: ComponentStateUpdate<object | undefined>
  ) => void;
  closeComponent: (options?: CloseComponentOptions<object>) => Promise<void>;
  useCallComponent: UseCallComponent;
};

type IsEmptyObject<T extends object> = keyof T extends never ? true : false;
