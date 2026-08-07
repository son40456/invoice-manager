import { NextResponse } from 'next/server';
import { getZaloSettings, saveZaloSettings } from '@/lib/zalo';

export async function GET() {
  try {
    const settings = await getZaloSettings();

    // Mask sensitive values trước khi trả về client
    const masked = { ...settings };
    if (masked['zalo_app_secret']) {
      masked['zalo_app_secret'] = masked['zalo_app_secret'].slice(0, 4) + '****';
    }
    if (masked['zalo_access_token']) {
      masked['zalo_access_token'] = masked['zalo_access_token'].slice(0, 8) + '...';
    }
    if (masked['zalo_refresh_token']) {
      masked['zalo_refresh_token'] = masked['zalo_refresh_token'].slice(0, 8) + '...';
    }

    return NextResponse.json({ success: true, data: masked });
  } catch (error) {
    console.error('Error fetching Zalo settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Chỉ cho phép lưu các key Zalo hợp lệ
    const allowed = [
      'zalo_app_id',
      'zalo_app_secret',
      'zalo_refresh_token',
      'zalo_template_new',
      'zalo_template_status',
    ];

    const filtered: Record<string, string> = {};
    for (const key of allowed) {
      if (typeof body[key] === 'string' && body[key].trim()) {
        filtered[key] = body[key].trim();
      }
    }

    const result = await saveZaloSettings(filtered);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('Error saving Zalo settings:', error);
    return NextResponse.json({ success: false, message: 'Lưu cấu hình thất bại' }, { status: 500 });
  }
}
