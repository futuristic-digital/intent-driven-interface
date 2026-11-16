import { z } from 'zod';

import {
  clientTimeContextSchema,
  componentInputSnapshotSchema,
} from './api-contracts.js';
import { type IDIAgentHandleChatRequestOptions } from './idi-agent.js';

const handleChatRequestBodySchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('generate-response'),
    messages: z.array(z.unknown()),
    componentMap: z.unknown(),
    clientTimeContext: clientTimeContextSchema,
  }),
  z.object({
    operation: z.literal('save-message'),
    message: z.unknown(),
  }),
  z.object({
    operation: z.literal('load-message-history'),
    beforeTimestamp: z.iso.datetime({ offset: true }).optional(),
  }),
  z.object({
    operation: z.literal('list-pinned-components'),
  }),
  z.object({
    operation: z.literal('pin-component'),
    componentId: z.string().min(1),
    ...componentInputSnapshotSchema.shape,
  }),
]);

/**
 * Validates the JSON body of a IDI POST before {@link IDIAgent.handleChatRequest}.
 */
export function parseHandleChatRequestBody(
  body: unknown
):
  | { success: true; data: IDIAgentHandleChatRequestOptions }
  | { success: false } {
  const parsed = handleChatRequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return { success: false };
  }

  return {
    success: true,
    // @ts-expect-error Wire JSON is structurally validated; UIMessage shapes are enforced at use sites.
    data: parsed.data,
  };
}
