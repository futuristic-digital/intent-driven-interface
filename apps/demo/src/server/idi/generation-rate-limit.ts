import 'server-only';

const generationWindowMs = 60_000;
const maxGenerationsPerChat = 6;
const maxGenerationsPerProcess = 24;
const recentGenerations: { chatId: string; startedAt: number }[] = [];

/** Reserve one generation attempt, or return seconds until both limits allow one. */
export function reserveDemoGeneration(chatId: string) {
  const now = Date.now();
  while (recentGenerations[0]?.startedAt <= now - generationWindowMs)
    recentGenerations.shift();

  const chatGenerations = recentGenerations.filter((entry) => entry.chatId === chatId);
  const blockedAt = Math.max(
    chatGenerations.length >= maxGenerationsPerChat ? chatGenerations[0].startedAt : 0,
    recentGenerations.length >= maxGenerationsPerProcess ? recentGenerations[0].startedAt : 0
  );
  if (blockedAt) return Math.ceil((blockedAt + generationWindowMs - now) / 1_000);

  recentGenerations.push({ chatId, startedAt: now });
  return undefined;
}
