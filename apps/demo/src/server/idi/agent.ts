import { IDIAgent } from '@intent-driven-interface/backend';

/** Satisfy the standard IDI persistence contract without storing demo data. */
export const idiAgent = new IDIAgent({
  model: { name: 'qwen-3-14b' },
  async saveMessages() {},
  async loadMessages() {
    return { messages: [], hasOlderMessages: false };
  },
  async loadPinnedComponents() {
    return [];
  },
  async pinComponent() {},
  instructions: `You are the logistics assistant in Flowdock.`,
});
