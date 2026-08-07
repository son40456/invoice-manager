import { NextResponse } from 'next/server';
import { getZaloConfig, refreshZaloToken } from '@/lib/zalo';

// Cron Job: Tự động làm mới Zalo Access Token mỗi ngày
// Được gọi bởi Vercel Cron (vercel.json) lúc 0h00 UTC hàng ngày
// Bảo vệ bằng CRON_SECRET để tránh gọi tùy tiện từ ngoài
export async function GET(request: Request) {
  // Kiểm tra secret để bảo vệ endpoint
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await getZaloConfig();

    if (!config) {
      console.warn('[Cron/Zalo] Chưa cấu hình Zalo. Bỏ qua.');
      return NextResponse.json({
        success: false,
        message: 'Chưa cấu hình Zalo OA. Vào Admin > Zalo ZNS để thiết lập.',
      });
    }

    const newToken = await refreshZaloToken(config);

    if (!newToken) {
      console.error('[Cron/Zalo] Refresh token thất bại.');
      return NextResponse.json({ success: false, message: 'Refresh token thất bại' }, { status: 500 });
    }

    console.log('[Cron/Zalo] Refresh token thành công lúc', new Date().toISOString());
    return NextResponse.json({
      success: true,
      message: `Access Token đã được làm mới lúc ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
    });
  } catch (error) {
    console.error('[Cron/Zalo] Lỗi không mong đợi:', error);
    return NextResponse.json({ success: false, message: 'Lỗi hệ thống' }, { status: 500 });
  }
}
