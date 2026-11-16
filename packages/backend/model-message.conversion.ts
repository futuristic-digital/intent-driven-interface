import { convertToModelMessages, type UIMessage } from 'ai';

import { uiToolMetadataSchema } from './api-contracts.js';

/**
 * Tool-call arguments retain original input. Tool results expose optional user-edited
 * input state alongside the final outcome; UI metadata alone is invisible to the model.
 * The projection never modifies stored messages or component output schemas.
 */
export const convertIDIMessagesToModelMessages = (messages: UIMessage[]) =>
  convertToModelMessages(
    messages.map((message) => ({
      ...message,
      parts: message.parts.map((part) => {
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
              : { componentInputState: metadata.componentInputState }),
            componentOutput: part.output ?? null,
          },
        };
      }),
    }))
  );
