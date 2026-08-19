import { NextResponse } from 'next/server';
import { sendTestNotification } from '@/lib/zalo';
import { verifyAdminSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const isAuthed = await verifyAdminSession(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const { phone, templateId, type } = await request.json();

    if (!phone || !templateId) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin số điện thoại hoặc template ID' }, { status: 400 });
    }

    const result = await sendTestNotification(phone, templateId, type);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error sending test ZNS:', error);
    return NextResponse.json({ success: false, message: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
