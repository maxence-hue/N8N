import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const RATE_LIMIT = 60;
const WINDOW_MS = 60 * 1000;

const ipHits = new Map<string, { count: number; expires: number }>();

export function middleware(request: NextRequest) {
  const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();
  const existing = ipHits.get(ip);
  if (!existing || existing.expires < now) {
    ipHits.set(ip, { count: 1, expires: now + WINDOW_MS });
    return NextResponse.next();
  }
  if (existing.count >= RATE_LIMIT) {
    const response = NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    response.headers.set('Retry-After', Math.ceil((existing.expires - now) / 1000).toString());
    return response;
  }
  existing.count += 1;
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*']
};
