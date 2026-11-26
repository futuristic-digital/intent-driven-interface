import { convertToModelMessages } from 'ai';

import { type IDIChatMessage, uiToolMetadataSchema } from '../api-contracts.js';

/**
 * User and assistant messages carry their timestamps into the model prompt.
 * Tool-call arguments retain the original input. Tool results expose the optional
 * full input override alongside the final outcome; UI metadata alone is invisible to the model.
 * The projection never modifies stored messages or component output schemas.
 */
export const convertIDIChatMessagesToModelMessages = (
  messages: IDIChatMessage[]
) =>
  convertToModelMessages(
    messages.map((message): IDIChatMessage => {
      const parts = message.parts.map((part) => {
        if (
          !part.type.startsWith('tool-') ||
          !('toolCallId' in part) ||
          part.state !== 'output-available'
        )
          return part;
        const metadata = uiToolMetadataSchema.parse(part.toolMetadata ?? {});
        return {
          ...part,
          output: {
            ...(metadata.componentInputState === undefined
              ? {}
              : { inputOverride: metadata.componentInputState }),
            output: part.output ?? null,
          },
        };
      });
      if (message.role !== 'system') {
        // Keep the timestamp inside the first SDK step, not in a separate assistant turn.
        const firstContentIndex = parts.findIndex(
          (part) => part.type !== 'step-start'
        );
        parts.splice(
          firstContentIndex === -1 ? parts.length : firstContentIndex,
          0,
          {
            type: 'text',
            text: `[${message.metadata.timestamp}]\n`,
          }
        );
      }
      return { ...message, parts };
    })
  );
