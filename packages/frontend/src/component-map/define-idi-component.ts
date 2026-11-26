import { type ZodType, z } from 'zod';

import { type ComponentMap } from './define-component-map.js';

export type ComponentToolState =
  'input-available' | 'input-streaming' | 'output-available';

/** A complete state replacement or an updater based on the latest local state. */
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
  setComponentInput: (update: ComponentStateUpdate<INPUT>) => void;
  /** Awaits the final message update before closing; if it fails, the draft stays open. */
  closeComponent: (options?: CloseComponentOptions<OUTPUT>) => Promise<void>;
  useOpenComponent: UseOpenComponent;
} & ([OUTPUT] extends [undefined]
    ? unknown
    : {
        /** Editable output draft, not the finalized result. */
        componentOutput: OUTPUT | undefined;
        setComponentOutput: (
          update: ComponentStateUpdate<OUTPUT | undefined>
        ) => void;
      });

/** Options for {@link OpenComponent} / `useOpenComponent`. */
export type OpenComponentOptions = {
  /**
   * When opening another component via `useOpenComponent`, set this to true
   * to reopen this component with its initial input and latest override after
   * the opened component closes successfully, even if it produces no output.
   */
  reopenThisComponentOnClose?: boolean;
};

/**
 * Opens a registered component with new input, without calling the LLM.
 */
export type OpenComponent<COMPONENT_MAP extends ComponentMap> = <
  K extends Extract<keyof COMPONENT_MAP, string>,
>(
  componentId: K,
  ...options: IsEmptyObject<ComponentInputOf<COMPONENT_MAP[K]>> extends true
    ? [
        input?: ComponentInputOf<COMPONENT_MAP[K]>,
        options?: OpenComponentOptions,
      ]
    : [
        input: ComponentInputOf<COMPONENT_MAP[K]>,
        options?: OpenComponentOptions,
      ]
) => void;

type UseOpenComponent = <
  COMPONENT_MAP extends ComponentMap,
>() => OpenComponent<COMPONENT_MAP>;

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
  /** When true, prevents the agent from opening this component without affecting client opens. */
  disableAgentOpen?: boolean;
  /**
   * When true, `useIDI().openComponent()` logs an error and does nothing.
   * This does not affect `useOpenComponent()` or agent tools.
   */
  disableStandaloneOpen?: boolean;
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
   * Receives effective input, draft output, their setters, `closeComponent`,
   * and `useOpenComponent`.
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
 * Registers a React component as an IDI tool.
 *
 * Field roles at a glance:
 * - `title` / `description` / `inputSchema` / `inputExamples` — wire-format
 *   tool definition for the model; keep descriptions concise and schemas rich.
 * - `component` — live interactive UI in chat.
 * - `componentSummary` — chat-history and sidebar pin pill; reflect the
 *   selected input values.
 * - `setComponentInput` — replaces the input override without changing the
 *   initial invocation.
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
  componentOutput?: unknown;
  setComponentInput: (update: ComponentStateUpdate<object>) => void;
  setComponentOutput?: (
    update: ComponentStateUpdate<object | undefined>
  ) => void;
  closeComponent: (options?: CloseComponentOptions<object>) => Promise<void>;
  useOpenComponent: UseOpenComponent;
};

type IsEmptyObject<T extends object> = keyof T extends never ? true : false;
