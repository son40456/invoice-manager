import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthed = await verifyAdminSession(request);

  // 1. Protect /admin UI pages
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

  // 2. Protect /api/invoices (GET, PATCH, DELETE only - POST is public for customer submissions)
  if (pathname === '/api/invoices' && request.method !== 'POST') {
    if (!isAuthed) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Vui lòng đăng nhập quản trị viên' }, { status: 401 });
    }
  }

  // 3. Protect /api/settings (POST only - GET is public for landing page config)
  if (pathname === '/api/settings' && request.method === 'POST') {
    if (!isAuthed) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Vui lòng đăng nhập quản trị viên' }, { status: 401 });
    }
  }

  // 4. Protect /api/zalo/* endpoints
  if (pathname.startsWith('/api/zalo')) {
    if (!isAuthed) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Vui lòng đăng nhập quản trị viên' }, { status: 401 });
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
  ],
};
