import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminSessionFast, getAdminSecretPath } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthed = await verifyAdminSessionFast(request);
  const adminSecretPath = getAdminSecretPath();

  // 1. Explicitly Block old/default /admin routes -> Return 404 Not Found
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  // 2. Protect dynamic secret admin path
  if (pathname === adminSecretPath || pathname.startsWith(`${adminSecretPath}/`)) {
    const isLoginPage = pathname === `${adminSecretPath}/login`;

    if (!isAuthed && !isLoginPage) {
      const loginUrl = new URL(`${adminSecretPath}/login`, request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Protect /api/invoices (GET, PATCH, DELETE - Return 404 Not Found for unauthenticated visitors)
  if (pathname === '/api/invoices' && request.method !== 'POST') {
    if (!isAuthed) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
  }

  // 4. Protect /api/settings (GET and POST - Return 404 Not Found for unauthenticated visitors)
  if (pathname === '/api/settings') {
    if (!isAuthed) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
  }

  // 5. Protect /api/zalo/* endpoints (Return 404 Not Found for unauthenticated visitors)
  if (pathname.startsWith('/api/zalo')) {
    if (!isAuthed) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
  }

  // 6. Protect /api/cron/* endpoints (Return 404 Not Found if missing or invalid CRON_SECRET)
  if (pathname.startsWith('/api/cron')) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
