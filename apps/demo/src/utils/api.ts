import type { IDIChatMessage } from '@intent-driven-interface/backend/api-contracts';

export const demoIDIUrl = `${process.env.NEXT_PUBLIC_DEMO_BASE_PATH}/api/idi`;
export const demoChatIdHeader = 'x-demo-chat-id';
const uuidV4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseDemoChatId(value: string | null): string | undefined {
  return value && uuidV4.test(value) ? value.toLowerCase() : undefined;
}

export type DemoChatHistoryResponse = {
  messages: IDIChatMessage[];
  aiAvailable: boolean;
};
