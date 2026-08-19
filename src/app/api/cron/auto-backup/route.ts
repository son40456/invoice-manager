import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function buildJsonDump(): Promise<Buffer> {
  const invoiceRequests = await prisma.invoiceRequest.findMany();
  const settings = await prisma.setting.findMany();
  const zaloLogs = await prisma.zaloLog.findMany();

  const backupData = {
    InvoiceRequest: invoiceRequests,
    Setting: settings,
    ZaloLog: zaloLogs,
  };

  return Buffer.from(JSON.stringify(backupData, null, 2), 'utf-8');
}

async function sendBackupTelegram(botToken: string, chatId: string, jsonBuffer: Buffer, filename: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendDocument`;
    const formData = new FormData();
    formData.append('chat_id', chatId);
    
    const blob = new Blob([new Uint8Array(jsonBuffer)], { type: 'application/json' });
    formData.append('document', blob, filename);
    formData.append('caption', `📦 Backup dữ liệu Hoá Đơn (Tạo lúc: ${new Date().toLocaleString('vi-VN')})`);

    const response = await fetch(url, { method: 'POST', body: formData });
    return response.ok;
  } catch (error) {
    console.error("Lỗi gửi backup qua Telegram:", error);
    return false;
  }
}

export async function GET(request: Request) {
  try {
    // Fail-Closed security: Require CRON_SECRET to be configured and matched, cloaked as 404
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json({ error: 'Missing Telegram config' }, { status: 500 });
    }

    const backupBuffer = await buildJsonDump();
    const success = await sendBackupTelegram(botToken, chatId, backupBuffer, 'backup.json');

    if (success) {
      return NextResponse.json({ success: true, message: 'Backup sent successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to send backup to Telegram' }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Auto backup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
