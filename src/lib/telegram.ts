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

  // Fallback to process.env if not configured in DB
  const token = config['telegram_bot_token'] || process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = config['telegram_chat_id'] || process.env.TELEGRAM_CHAT_ID || '';

  return { token, chatId };
}

export async function sendTelegramNotification(invoice: {
  order_id: string;
  company_name: string;
  tax_id: string;
  phone: string;
}) {
  try {
    const { token, chatId } = await getTelegramConfig();
    if (!token || !chatId) return;

    const message = `🔔 *Có yêu cầu xuất hoá đơn mới!*\n\n` +
      `📦 *Mã đơn hàng:* ${invoice.order_id}\n` +
      `🏢 *Công ty:* ${invoice.company_name}\n` +
      `📄 *MST:* ${invoice.tax_id}\n` +
      `📞 *SĐT:* ${invoice.phone}\n\n` +
      `👉 _Đăng nhập vào hệ thống để xử lý._`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      })
    });
  } catch (error) {
    console.error('[Telegram] Lỗi gửi thông báo đơn mới:', error);
  }
}

/** Send security alerts (successful login, brute-force warning, 2FA changes) */
export async function sendTelegramSecurityAlert(message: string) {
  try {
    const { token, chatId } = await getTelegramConfig();
    if (!token || !chatId) return;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      })
    });
  } catch (error) {
    console.error('[Telegram] Lỗi gửi cảnh báo bảo mật:', error);
  }
}
