import 'server-only';
import { IDIAgent, gateway } from '@intent-driven-interface/backend';
import { upsertDemoChatMessage } from './chat-store';

export function createDemoAgent(chatId: string) {
  return new IDIAgent({
    model: gateway('openai/gpt-oss-20b'),
    providerOptions: { gateway: { order: ['groq'], sort: 'ttft' } },
    instructions: 'You are the logistics assistant in Flowdock.',
    onMessageUpdate: (message) => upsertDemoChatMessage(chatId, message),
  });
}
