import { NextResponse } from 'next/server';
import { clearAdminSessionCookie, incrementSessionVersion } from '@/lib/auth';

export async function POST() {
  try {
    // Thu hồi phiên toàn cục để vô hiệu hoá tất cả các máy tính / điện thoại khác
    await incrementSessionVersion();
  } catch (error) {
    console.error('Error incrementing session version on logout:', error);
  }

  const response = NextResponse.json({ success: true, message: 'Đăng xuất thành công trên tất cả thiết bị' });
  return clearAdminSessionCookie(response);
}
