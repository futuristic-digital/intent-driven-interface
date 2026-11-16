import { NextResponse, type NextRequest } from 'next/server';
import { DEMO_VISITOR_COOKIE, getDemoVisitorId } from './server/demo-visitor';

/** Establish ownership before the browser starts parallel history/pin requests. */
export function middleware(request: NextRequest) {
  const existingVisitorId = getDemoVisitorId(request);
  const visitorId = existingVisitorId ?? crypto.randomUUID();
  request.cookies.set(DEMO_VISITOR_COOKIE, visitorId);

  const response = NextResponse.next({ request: { headers: request.headers } });
  response.headers.set('Cache-Control', 'private, no-store');
  if (!existingVisitorId) {
    response.cookies.set(DEMO_VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
  }
  return response;
}

export const config = { matcher: ['/', '/api/:path*'] };
