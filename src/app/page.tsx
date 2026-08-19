import prisma from '@/lib/prisma';
import InvoiceForm from '@/components/InvoiceForm';
import { PUBLIC_SETTING_KEYS } from '@/app/api/settings/route';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = {
  guideTitle: "Hướng dẫn Yêu cầu hoá đơn",
  guideContent: "1. Điền chính xác Mã đơn hàng của bạn.\n2. Cung cấp Mã số thuế, hệ thống sẽ tự động tra cứu Tên Công ty/Tổ chức.\n3. Điền Email thật để nhận Hoá đơn điện tử.",
  supportTitle: "Hỗ trợ nhanh",
  supportContent: "Mọi thắc mắc kỹ thuật hay sai sót trong quá trình điền Form, bạn có thể liên hệ với chúng tôi để phân xử nhé.",
  zaloGroupLink: "https://zalo.me/g/ftvesr052",
  zaloGroupQrUrl: ""
};

async function getSiteSettings() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: { in: Array.from(PUBLIC_SETTING_KEYS) }
      }
    });

    const settingsObj = { ...DEFAULT_SETTINGS };
    settings.forEach(s => {
      // @ts-ignore
      if (PUBLIC_SETTING_KEYS.includes(s.key)) {
        // @ts-ignore
        settingsObj[s.key] = s.value;
      }
    });

    return settingsObj;
  } catch (error) {
    console.error('Error loading site settings server-side:', error);
    return DEFAULT_SETTINGS;
  }
}

export default async function Page() {
  const initialSettings = await getSiteSettings();
  return <InvoiceForm initialSettings={initialSettings} />;
}
