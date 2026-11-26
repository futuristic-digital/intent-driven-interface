import type {
  IDIChatMessage,
  IDIGenerationRequest,
  IDIRequestBody,
} from '@intent-driven-interface/backend/api-contracts';
import { trimMessagesForAgent } from '@intent-driven-interface/backend/trim-messages-for-agent';
import { DefaultChatTransport } from 'ai';

import type { ComponentMap } from '../component-map/define-component-map.js';
import { convertComponentMapForBackend } from './component-map-for-backend.conversion.js';

/** Host endpoint and optional authentication headers shared by both request types. */
export type IDIBackend = {
  url: string;
  requestHeaders?: HeadersInit;
};

export function createGenerationTransport(
  backend: IDIBackend,
  components: ComponentMap
) {
  return new DefaultChatTransport<IDIChatMessage>({
    api: backend.url,
    prepareSendMessagesRequest: async ({ messages }) => ({
      headers: backend.requestHeaders,
      body: {
        messages: trimMessagesForAgent(messages),
        componentMap: await convertComponentMapForBackend(components),
      } satisfies IDIGenerationRequest,
    }),
  });
}

export async function postMessageUpdate(
  backend: IDIBackend,
  message: IDIChatMessage
) {
  const headers = new Headers(backend.requestHeaders);
  headers.set('Content-Type', 'application/json');
  const response = await fetch(backend.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message } satisfies IDIRequestBody),
  });
  if (response.status !== 204) {
    throw new Error(`Message update failed (HTTP ${response.status})`);
  }
}
