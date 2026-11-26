import { idiRequestBodySchema } from '@intent-driven-interface/backend/api-contracts';

import { createDemoAgent } from '../../../server/idi/agent';
import { isDemoAIAvailable } from '../../../server/idi/ai-availability';
import {
  isDemoChatMessageWithinLimit,
  loadDemoChatMessages,
} from '../../../server/idi/chat-store';
import { reserveDemoGeneration } from '../../../server/idi/generation-rate-limit';
import { readDemoChatBody } from '../../../server/idi/request-body';
import {
  demoChatIdHeader,
  parseDemoChatId,
  type DemoChatHistoryResponse,
} from '../../../utils/api';

export const runtime = 'nodejs';

const noStoreHeaders = { 'Cache-Control': 'no-store' };

function chatError(
  error: string,
  status: number,
  headers?: Record<string, string>
) {
  return Response.json(
    { error },
    { status, headers: { ...noStoreHeaders, ...headers } }
  );
}

export async function GET(request: Request) {
  const chatId = parseDemoChatId(request.headers.get(demoChatIdHeader));
  if (!chatId)
    return chatError(`Expected a UUID v4 in ${demoChatIdHeader}`, 400);

  const history = await loadDemoChatMessages(chatId);
  if (!history.success) return chatError('Could not load chat history', 500);

  return Response.json(
    {
      messages: history.data,
      aiAvailable: isDemoAIAvailable(),
    } satisfies DemoChatHistoryResponse,
    { headers: noStoreHeaders }
  );
}

export async function POST(request: Request) {
  const chatId = parseDemoChatId(request.headers.get(demoChatIdHeader));
  if (!chatId)
    return chatError(`Expected a UUID v4 in ${demoChatIdHeader}`, 400);

  const requestBody = await readDemoChatBody(request);
  if ('status' in requestBody) {
    return requestBody.status === 413
      ? chatError('Request is too large', 413)
      : chatError('Invalid payload', 400);
  }

  const parsedBody = await idiRequestBodySchema.safeParseAsync(
    requestBody.body
  );
  if (!parsedBody.success) return chatError('Invalid payload', 400);

  const body = parsedBody.data;
  const messages = 'message' in body ? [body.message] : body.messages;
  if (!messages.every(isDemoChatMessageWithinLimit)) {
    return chatError('Chat message is too large', 413);
  }

  if ('messages' in body) {
    if (!isDemoAIAvailable())
      return chatError('AI generation is unavailable', 503);
    // The demo is text-only; do not forward attachments or remote file references.
    if (
      body.messages.some((message) =>
        message.parts.some(
          (part) => part.type === 'file' || part.type === 'reasoning-file'
        )
      )
    )
      return chatError('Attachments are not supported in the demo', 400);

    const retryAfter = reserveDemoGeneration(chatId);
    if (retryAfter !== undefined) {
      return chatError('Too many generation requests', 429, {
        'Retry-After': String(retryAfter),
      });
    }
  }

  return createDemoAgent(chatId).handleChatRequest(requestBody.body);
}
