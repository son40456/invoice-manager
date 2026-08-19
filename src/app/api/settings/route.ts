import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/auth';

// Whitelisted public settings that are safe to expose and modify via this endpoint
export const PUBLIC_SETTING_KEYS = [
  'guideTitle',
  'guideContent',
  'supportTitle',
  'supportContent',
  'zaloGroupLink',
  'zaloGroupQrUrl'
] as const;

type PublicSettingKey = typeof PUBLIC_SETTING_KEYS[number];

// Helper to upsert a key-value setting
async function upsertSetting(key: string, value: string) {
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

// Default settings
const DEFAULT_SETTINGS: Record<PublicSettingKey, string> = {
  guideTitle: "Hướng dẫn Yêu cầu hoá đơn",
  guideContent: "1. Điền chính xác Mã đơn hàng của bạn.\n2. Cung cấp Mã số thuế, hệ thống sẽ tự động tra cứu Tên Công ty/Tổ chức.\n3. Điền Email thật để nhận Hoá đơn điện tử.",
  supportTitle: "Hỗ trợ nhanh",
  supportContent: "Mọi thắc mắc kỹ thuật hay sai sót trong quá trình điền Form, bạn có thể liên hệ với chúng tôi để phân xử nhé.",
  zaloGroupLink: "https://zalo.me/g/ftvesr052",
  zaloGroupQrUrl: ""
};

export async function GET(request: Request) {
  try {
    const isAuthed = await verifyAdminSession(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const settings = await prisma.setting.findMany({
      where: {
        key: { in: Array.from(PUBLIC_SETTING_KEYS) }
      }
    });

    const settingsObj: Record<string, string> = { ...DEFAULT_SETTINGS };
    
    settings.forEach(s => {
      if (PUBLIC_SETTING_KEYS.includes(s.key as PublicSettingKey)) {
        settingsObj[s.key] = s.value;
      }
    });

    return NextResponse.json({ success: true, data: settingsObj });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ success: true, data: DEFAULT_SETTINGS });
  }
}

export async function POST(request: Request) {
  try {
    const isAuthed = await verifyAdminSession(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const body = await request.json();
    const savedData: Record<string, string> = {};
    
    // Strict Whitelist: Only allow modifications to safe public setting keys
    for (const [key, value] of Object.entries(body)) {
      if (PUBLIC_SETTING_KEYS.includes(key as PublicSettingKey) && typeof value === 'string') {
        await upsertSetting(key, value);
        savedData[key] = value;
      }
    }
    
    return NextResponse.json({ success: true, data: savedData });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}
