import { type JSONSchema7, type UIMessage } from 'ai';
import { z } from 'zod';


const componentIdSchema = z.string().min(1);
const jsonObjectSchema = z.record(z.string(), z.json());

// Trust the frontend to generate valid JSON Schema; check only the wire shape.
const serializedToolSchema = z.custom<JSONSchema7>(
  (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
  'Expected a JSON Schema object'
);

export const componentMapSchema = z.record(
  componentIdSchema,
  z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    inputSchema: serializedToolSchema,
    inputExamples: z.array(jsonObjectSchema).optional(),
    outputSchema: serializedToolSchema.optional(),
  })
);

/** Component tool definitions sent over the wire, without React components. */
export type ComponentMapForBackend = z.infer<typeof componentMapSchema>;

const messageMetadataSchema = z.object({ timestamp: z.iso.datetime({ offset: true }) });
const timestampedMessageSchema = z.looseObject({ metadata: messageMetadataSchema });
type MessageMetadata = z.infer<typeof messageMetadataSchema>;

/** IDI messages carry their ISO creation time in the AI SDK's metadata field. */
export type IDIChatMessage = UIMessage<MessageMetadata> & { metadata: MessageMetadata };

/** A message with even one streaming part is not a complete update. */
export const hasStreamingParts = (message: Pick<IDIChatMessage, 'parts'>): boolean =>
  message.parts.some(
    (part) =>
      'state' in part &&
      (part.state === 'input-streaming' || part.state === 'streaming')
  );

/** Schema shared by storage and rendering when reading untrusted wire metadata. */
export const uiToolMetadataSchema = z.object({
  componentInputState: z.json().optional(),
  /** Draft output is cleared from metadata on close; the final result lives in the tool output. */
  componentOutputState: z.json().optional(),
  /** Lifecycle end time, also used to display finalized output. */
  closedAt: z.string().optional(),
  agentFollowUp: z.boolean().optional(),
  /** Persisted caller snapshot used to resume a client-opened follow-up view. */
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

function restoreOmittedToolValues(message: unknown): unknown {
  if (
    typeof message !== 'object' ||
    message === null ||
    !('parts' in message) ||
    !Array.isArray(message.parts)
  ) {
    return message;
  }

  return {
    ...message,
    parts: message.parts.map((part: unknown) => {
      if (
        typeof part !== 'object' ||
        part === null ||
        !('type' in part) ||
        typeof part.type !== 'string' ||
        !(part.type.startsWith('tool-') || part.type === 'dynamic-tool') ||
        !('state' in part) ||
        part.state !== 'output-available'
      ) {
        return part;
      }

      // The client uses undefined output for a live component. JSON omits
      // undefined values, but the SDK requires these keys in this state.
      return { input: undefined, output: undefined, ...part };
    }),
  };
}

async function validateChatMessages(messages: z.infer<typeof timestampedMessageSchema>[]) {
  // Keep the SDK runtime out of imports that only consume wire types or
  // synchronous schemas. Stored messages may refer to older tool definitions.
  const { safeValidateUIMessages } = await import('ai');
  const result = await safeValidateUIMessages<IDIChatMessage>({
    messages: messages.map(restoreOmittedToolValues),
  });
  if (!result.success) return undefined;

  const valid = result.data.every(
    (message) =>
      message.id.length > 0 &&
      message.parts.every(
        (part) =>
          !('toolCallId' in part) ||
          part.toolMetadata === undefined ||
          uiToolMetadataSchema.safeParse(part.toolMetadata).success
      )
  );
  return valid ? result.data : undefined;
}

/** Validate messages from a POST body or host-loaded history using `safeParseAsync`. */
export const idiMessagesSchema = z
  .array(timestampedMessageSchema)
  .transform(async (messages, context) => {
    if (messages.length === 0) return [];
    const validated = await validateChatMessages(messages);
    if (validated) return validated;
    context.addIssue({ code: 'custom', message: 'Invalid IDI messages' });
    return z.NEVER;
  });


const generationRequestSchema = z.strictObject({
  messages: idiMessagesSchema.refine((messages) => messages.length > 0, {
    message: 'Expected at least one message',
  }),
  componentMap: componentMapSchema,
});

export type IDIGenerationRequest = z.infer<typeof generationRequestSchema>;

// Only component changes originate outside a model turn. Reuse the same SDK
// validation as history, including restoration of tool keys omitted by JSON.
const componentUpdateRequestSchema = z
  .strictObject({ message: timestampedMessageSchema })
  .transform(async ({ message: raw }, context) => {
    const message = (await validateChatMessages([raw]))?.[0];
    if (
      message?.role === 'assistant' &&
      !hasStreamingParts(message) &&
      message.parts.some((part) => part.type.startsWith('tool-'))
    ) {
      return { message };
    }
    context.addIssue({
      code: 'custom',
      message: 'Expected a complete assistant message containing a component',
    });
    return z.NEVER;
  });

/** The same POST route accepts a generation request or one changed component message. */
export const idiRequestBodySchema = z.union([
  generationRequestSchema,
  componentUpdateRequestSchema,
]);
export type IDIRequestBody = z.infer<typeof idiRequestBodySchema>;
