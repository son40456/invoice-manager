import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Helper to upsert a key-value setting
async function upsertSetting(key: string, value: string) {
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

// Default settings
const DEFAULT_SETTINGS = {
  guideTitle: "Hướng dẫn Yêu cầu hoá đơn",
  guideContent: "1. Điền chính xác Mã đơn hàng của bạn.\n2. Cung cấp Mã số thuế, hệ thống sẽ tự động tra cứu Tên Công ty/Tổ chức.\n3. Điền Email thật để nhận Hoá đơn điện tử.",
  supportTitle: "Hỗ trợ nhanh",
  supportContent: "Mọi thắc mắc kỹ thuật hay sai sót trong quá trình điền Form, bạn có thể liên hệ với chúng tôi để phân xử nhé.",
  zaloGroupLink: "https://zalo.me/g/ftvesr052",
  zaloGroupQrUrl: "" // Empty by default
};

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    // Convert array of settings to object
    const settingsObj = { ...DEFAULT_SETTINGS };
    
    settings.forEach(s => {
      // @ts-ignore
      settingsObj[s.key] = s.value;
    });

    return NextResponse.json({ success: true, data: settingsObj });
  } catch (error) {
    console.error('Error fetching settings:', error);
    // If DB fails (e.g. not migrated yet), return defaults so site doesn't break
    return NextResponse.json({ success: true, data: DEFAULT_SETTINGS });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Save all keys in the body
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        await upsertSetting(key, value);
      }
    }
    
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}
