import type { NextRequest } from 'next/server';
import { getDemoVisitorId } from '../../../server/demo-visitor';
import { idiAgent } from '../../../server/idi/agent';

/** Delegate IDI operations and streaming to the framework using host-owned identity. */
export async function POST(request: NextRequest) {
  const visitorId = getDemoVisitorId(request);
  if (!visitorId) {
    return Response.json(
      { error: 'Reload the demo to initialize a visitor cookie.' },
      { status: 400 }
    );
  }

  const body: unknown = await request.json().catch(() => null);
  return idiAgent.handleChatRequest(body, visitorId);
}
