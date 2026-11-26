import {
  createUIMessageStreamResponse,
  generateId,
  streamText,
  toUIMessageStream,
  type LanguageModel,
} from 'ai';

import {
  hasStreamingParts,
  type IDIChatMessage,
  type IDIGenerationRequest,
} from '../api-contracts.js';
import { trimMessagesForAgent } from '../trim-messages-for-agent.js';
import { buildToolsFromComponentMap } from './component-map-to-tools.conversion.js';
import { convertIDIChatMessagesToModelMessages } from './model-message.conversion.js';

export type AgentGenerationSettings = Pick<
  Parameters<typeof streamText>[0],
  'providerOptions' | 'reasoning' | 'temperature' | 'maxOutputTokens'
> & {
  /** AI SDK model instance configured by the host. */
  model: Extract<LanguageModel, object>;
};

/** Streams a single model turn; component tools are completed by the client. */
export async function streamAgentTurn(
  { messages, componentMap }: IDIGenerationRequest,
  settings: AgentGenerationSettings & { instructions: string },
  publishAssistantMessage?: (message: IDIChatMessage) => Promise<void>
): Promise<Response> {
  const tools = buildToolsFromComponentMap(componentMap);
  const modelMessages = await convertIDIChatMessagesToModelMessages(
    trimMessagesForAgent(messages)
  );
  const stream = streamText({ ...settings, messages: modelMessages, tools });

  const lastMessage = messages.at(-1);
  const uiMessageStream = toUIMessageStream({
    stream: stream.stream,
    tools,
    redactToolErrors: true,
    // A continuation keeps the original assistant ID and creation time.
    originalMessages: messages,
    generateMessageId: generateId,
    messageMetadata: ({ part }) => {
      if (part.type !== 'start') return undefined;
      return {
        timestamp: lastMessage?.role === 'assistant'
          ? lastMessage.metadata.timestamp
          : new Date().toISOString(),
      };
    },
    // Without a callback the SDK need not reconstruct the message on the server.
    onEnd: publishAssistantMessage
      ? async (event) => {
          if (
            event.outcome.status === 'completed' &&
            !event.isAborted &&
            !event.isCancelled &&
            event.finishReason !== undefined &&
            event.finishReason !== 'error' &&
            event.finishReason !== 'interrupted' &&
            !hasStreamingParts(event.responseMessage)
          ) {
            await publishAssistantMessage(event.responseMessage);
          }
        }
      : undefined,
  });

  return createUIMessageStreamResponse({ stream: uiMessageStream });
}
