import { type JSONSchema7 } from 'ai';
import { z } from 'zod';

/** Browser clock and timezone captured afresh for each agent generation. */
export const clientTimeContextSchema = z.object({
  currentDateTime: z.iso.datetime(),
  timeZone: z
    .string()
    .min(1)
    .max(100)
    .refine((timeZone) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone });
        return true;
      } catch {
        return false;
      }
    }, 'Expected a valid timezone'),
});

export type ClientTimeContext = z.infer<typeof clientTimeContextSchema>;

/**
 * Wire-format component map sent from the frontend in the IDI backend POST body.
 * Schemas only — no React components or functions.
 */
export type ComponentMapForBackend = Record<
  string,
  {
    title?: string;
    description?: string;
    inputSchema: JSONSchema7;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inputExamples?: any[];
    outputSchema?: JSONSchema7;
  }
>;

/** A pin retains invocation input independently from the user's current input state. */
export const componentInputSnapshotSchema = z.object({
  componentInput: z.record(z.string(), z.unknown()),
  componentInputState: z.record(z.string(), z.unknown()).optional(),
});

export type ComponentInputSnapshot = z.infer<
  typeof componentInputSnapshotSchema
>;

/** Pins are distinct when either original input or captured input state differs. */
export type PinnedIDIComponent = ComponentInputSnapshot & {
  id: string;
  componentId: string;
};

/** Metadata attached to streamed IDI chat messages. */
export type UIMessageMetadata = {
  /** ISO creation time; required for persistence. */
  timestamp: string;
};

/** Wire shape for a persisted IDI chat message (JSON-safe; parts untyped). */
export type IDIMessageWire = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  metadata: UIMessageMetadata;
  parts: unknown[];
};

/** Schema shared by storage and rendering when reading untrusted wire metadata. */
export const uiToolMetadataSchema = z.object({
  componentInputState: z.json().optional(),
  /** Draft output is discarded when the lifecycle ends. */
  componentOutputState: z.json().optional(),
  /** Lifecycle end time, also used to display finalized output. */
  closedAt: z.string().optional(),
  /** Client-only navigation/follow-up options; storage drops these. */
  agentFollowUp: z.boolean().optional(),
  resumeCaller: z
    .object({
      componentId: z.string(),
      input: z.json(),
      componentInputState: z.json().optional(),
    })
    .optional(),
});

/** Persisted UI state is separate from the model's tool input and final output. */
export type UIToolMetadata = z.infer<typeof uiToolMetadataSchema>;
