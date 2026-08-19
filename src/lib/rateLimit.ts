import { sendTelegramSecurityAlert } from '@/lib/telegram';

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  blockedUntil?: number;
}

// In-memory store for rate limiting by IP (persists per serverless instance lifecycle)
const attemptsMap = new Map<string, AttemptRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
const WINDOW_DURATION_MS = 15 * 60 * 1000;  // 15 minutes window
const WARNING_THRESHOLD = 3;

/** Clean up expired records every 5 minutes */
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of attemptsMap.entries()) {
    if (record.blockedUntil && record.blockedUntil < now) {
      attemptsMap.delete(ip);
    } else if (now - record.lastAttemptAt > WINDOW_DURATION_MS) {
      attemptsMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  return '127.0.0.1';
}

export function checkRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = attemptsMap.get(ip);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  // Check if currently locked out
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  // If window expired, reset
  if (now - record.firstAttemptAt > WINDOW_DURATION_MS) {
    attemptsMap.delete(ip);
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - record.count);
  return { allowed: remaining > 0, remainingAttempts: remaining };
}

export async function recordFailedAttempt(ip: string, userAgent: string): Promise<{ blocked: boolean; warningTriggered: boolean }> {
  const now = Date.now();
  let record = attemptsMap.get(ip);

  if (!record || now - record.firstAttemptAt > WINDOW_DURATION_MS) {
    record = {
      count: 1,
      firstAttemptAt: now,
      lastAttemptAt: now,
    };
  } else {
    record.count += 1;
    record.lastAttemptAt = now;
  }

  let blocked = false;
  let warningTriggered = false;

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.blockedUntil = now + LOCKOUT_DURATION_MS;
    blocked = true;

    // Send high-priority security alert to Telegram
    const timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    sendTelegramSecurityAlert(
      `🚨 *[CẢNH BÁO BẢO MẬT] ĐÃ KHÓA IP ĐĂNG NHẬP ADMIN*\n\n` +
      `❌ *Lý do:* Nhập sai mật khẩu liên tiếp ${record.count} lần.\n` +
      `🌐 *Địa chỉ IP:* \`${ip}\`\n` +
      `💻 *Trình duyệt:* \`${userAgent.slice(0, 100)}\`\n` +
      `⏰ *Thời gian:* ${timeStr}\n` +
      `🔒 *Trạng thái:* Tạm khóa IP trong 15 phút.`
    ).catch(console.error);
  } else if (record.count === WARNING_THRESHOLD) {
    warningTriggered = true;
    const timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    sendTelegramSecurityAlert(
      `⚠️ *[CẢNH BÁO] Phát hiện thử mật khẩu Admin bất thường*\n\n` +
      `🔍 *Số lần sai:* ${record.count}/${MAX_FAILED_ATTEMPTS} lần\n` +
      `🌐 *Địa chỉ IP:* \`${ip}\`\n` +
      `💻 *Trình duyệt:* \`${userAgent.slice(0, 100)}\`\n` +
      `⏰ *Thời gian:* ${timeStr}`
    ).catch(console.error);
  }

  attemptsMap.set(ip, record);
  return { blocked, warningTriggered };
}

export async function recordSuccessfulAttempt(ip: string, userAgent: string): Promise<void> {
  // Clear any failed attempts history for this IP
  attemptsMap.delete(ip);

  // Send successful login notification to Telegram
  const timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  sendTelegramSecurityAlert(
    `🔐 *[LMC Hoá Đơn] Đăng nhập Admin thành công*\n\n` +
    `🌐 *Địa chỉ IP:* \`${ip}\`\n` +
    `💻 *Thiết bị:* \`${userAgent.slice(0, 120)}\`\n` +
    `⏰ *Thời gian:* ${timeStr}`
  ).catch(console.error);
}
