import { idiAgent } from '../../../server/idi/agent';

/** Use the standard IDI protocol without a visitor session or storage. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  return idiAgent.handleChatRequest(body, 'anonymous-demo');
}
