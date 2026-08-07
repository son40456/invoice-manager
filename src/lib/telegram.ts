import prisma from '@/lib/prisma';

export async function getTelegramConfig() {
  const settings = await prisma.setting.findMany({
    where: {
      key: { in: ['telegram_bot_token', 'telegram_chat_id'] }
    }
  });

  const config: Record<string, string> = {};
  for (const s of settings) {
    config[s.key] = s.value;
  }
  return config;
}

export async function sendTelegramNotification(invoice: {
  order_id: string;
  company_name: string;
  tax_id: string;
  phone: string;
}) {
  try {
    const config = await getTelegramConfig();
    const token = config['telegram_bot_token'];
    const chatId = config['telegram_chat_id'];

    if (!token || !chatId) {
      return; // Không có cấu hình
    }

    const message = `🔔 *Có yêu cầu xuất hoá đơn mới!*\n\n` +
      `📦 *Mã đơn hàng:* ${invoice.order_id}\n` +
      `🏢 *Công ty:* ${invoice.company_name}\n` +
      `📄 *MST:* ${invoice.tax_id}\n` +
      `📞 *SĐT:* ${invoice.phone}\n\n` +
      `👉 _Đăng nhập vào hệ thống để xử lý._`;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      })
    });

    if (!res.ok) {
      console.error('[Telegram] Gửi tin thất bại:', await res.text());
    }
  } catch (error) {
    console.error('[Telegram] Lỗi gửi thông báo:', error);
  }
}
