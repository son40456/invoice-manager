import { NextResponse } from 'next/server';
import { clearAdminSessionCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Đăng xuất thành công' });
  return clearAdminSessionCookie(response);
}
