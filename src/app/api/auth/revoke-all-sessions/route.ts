import { NextResponse } from 'next/server';
import { verifyAdminSession, incrementSessionVersion, clearAdminSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const isAuthed = await verifyAdminSession(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    // Tăng session version để vô hiệu hoá tất cả token đang lưu trên mọi máy tính/điện thoại
    await incrementSessionVersion();

    const response = NextResponse.json({
      success: true,
      message: 'Đã đăng xuất khỏi tất cả các thiết bị thành công.',
    });

    // Xóa luôn cookie của thiết bị hiện tại để điều hướng về đăng nhập
    return clearAdminSessionCookie(response);
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
