import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { setAdminSessionCookie } from '@/lib/auth';
import { getClientIp, checkRateLimit, recordFailedAttempt, recordSuccessfulAttempt } from '@/lib/rateLimit';
import { verifyTOTPToken } from '@/lib/totp';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // 1. Chống Brute-force: Kiểm tra Rate Limit
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      const mins = Math.ceil((rateCheck.retryAfterSeconds || 900) / 60);
      return NextResponse.json(
        {
          success: false,
          error: `Bạn đã nhập sai quá 5 lần. Vui lòng thử lại sau ${mins} phút.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { password, totpCode } = body;

    if (!password) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập mật khẩu' }, { status: 400 });
    }

    // 2. Lấy cấu hình mật khẩu và 2FA từ Database
    const settings = await prisma.setting.findMany({
      where: {
        key: { in: ['admin_password_hash', 'admin_2fa_enabled', 'admin_2fa_secret', 'admin_2fa_recovery_codes'] }
      }
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    const hash = settingsMap['admin_password_hash'];
    const is2faEnabled = settingsMap['admin_2fa_enabled'] === 'true';
    const totpSecret = settingsMap['admin_2fa_secret'] || '';
    const recoveryCodesJson = settingsMap['admin_2fa_recovery_codes'] || '[]';

    // 3. Kiểm tra mật khẩu (mặc định 'admin123' nếu chưa thiết lập)
    let isPasswordValid = false;
    if (!hash) {
      isPasswordValid = password === 'admin123';
    } else {
      isPasswordValid = await bcrypt.compare(password, hash);
    }

    if (!isPasswordValid) {
      // Artificial delay 800ms để chống timing attack
      await new Promise(resolve => setTimeout(resolve, 800));
      await recordFailedAttempt(ip, userAgent);
      return NextResponse.json({ success: false, error: 'Mật khẩu không chính xác' }, { status: 401 });
    }

    // 4. Nếu đã bật 2FA: Kiểm tra mã OTP
    if (is2faEnabled && totpSecret) {
      // Nếu chưa gửi mã OTP -> Yêu cầu client hiển thị form nhập OTP
      if (!totpCode) {
        return NextResponse.json({
          success: true,
          require2FA: true,
          message: 'Vui lòng nhập mã xác thực 2 bước (2FA) từ ứng dụng Authenticator'
        });
      }

      // Kiểm tra mã OTP hoặc Recovery Code
      const isOtpValid = verifyTOTPToken(totpCode, totpSecret);
      let isRecoveryCodeValid = false;

      if (!isOtpValid) {
        try {
          const recoveryCodes: string[] = JSON.parse(recoveryCodesJson);
          const cleanInput = totpCode.trim().toUpperCase();
          if (recoveryCodes.includes(cleanInput)) {
            isRecoveryCodeValid = true;
            // Xóa mã khôi phục đã dùng
            const updatedCodes = recoveryCodes.filter(c => c !== cleanInput);
            await prisma.setting.upsert({
              where: { key: 'admin_2fa_recovery_codes' },
              update: { value: JSON.stringify(updatedCodes) },
              create: { key: 'admin_2fa_recovery_codes', value: JSON.stringify(updatedCodes) }
            });
          }
        } catch {
          // ignore
        }
      }

      if (!isOtpValid && !isRecoveryCodeValid) {
        await new Promise(resolve => setTimeout(resolve, 800));
        await recordFailedAttempt(ip, userAgent);
        return NextResponse.json({ success: false, error: 'Mã xác thực 2FA không chính xác' }, { status: 401 });
      }
    }

    // 5. Đăng nhập thành công: Reset Rate Limit & Gửi thông báo Telegram
    await recordSuccessfulAttempt(ip, userAgent);

    // 6. Cấp phát Cookie phiên bảo mật
    const response = NextResponse.json({ success: true, message: 'Đăng nhập thành công' });
    return setAdminSessionCookie(response);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
