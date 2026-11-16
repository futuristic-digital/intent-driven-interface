import type { NextRequest } from 'next/server';

export const DEMO_VISITOR_COOKIE = 'idi-demo-visitor';

/** An anonymous demo partition key, not an authenticated user identity. */
export function getDemoVisitorId(request: NextRequest): string | undefined {
  const value = request.cookies.get(DEMO_VISITOR_COOKIE)?.value;
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
    ? value
    : undefined;
}
