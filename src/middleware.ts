import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthed = await verifyAdminSession(request);

  // 1. Protect /admin UI pages (redirect unauthenticated to /admin/login)
  if (pathname.startsWith('/admin')) {
    const isLoginPage = pathname === '/admin/login';

    if (!isAuthed && !isLoginPage) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    if (isAuthed && isLoginPage) {
      const adminUrl = new URL('/admin', request.url);
      return NextResponse.redirect(adminUrl);
    }
  }

  // 2. Protect /api/invoices (GET, PATCH, DELETE - Return 404 Not Found for unauthenticated visitors)
  // Note: POST /api/invoices stays open for public invoice form submission
  if (pathname === '/api/invoices' && request.method !== 'POST') {
    if (!isAuthed) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
  }

  // 3. Protect /api/settings (GET and POST - Return 404 Not Found for unauthenticated visitors)
  // Public homepage loads settings directly on server SSR, so API is 100% private to admin
  if (pathname === '/api/settings') {
    if (!isAuthed) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
  }

  // 4. Protect /api/zalo/* endpoints (Return 404 Not Found for unauthenticated visitors)
  if (pathname.startsWith('/api/zalo')) {
    if (!isAuthed) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
  }

  // 5. Protect /api/cron/* endpoints (Return 404 Not Found if missing or invalid CRON_SECRET)
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
    '/admin/:path*',
    '/api/invoices',
    '/api/settings',
    '/api/zalo/:path*',
    '/api/cron/:path*',
  ],
};
