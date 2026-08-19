import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyAdminSession } from '@/lib/auth';
import { generateTOTPSecret, getTOTPAuthUri, verifyTOTPToken, generateRecoveryCodes } from '@/lib/totp';
import { sendTelegramSecurityAlert } from '@/lib/telegram';

export async function GET(request: Request) {
  try {
    const isAuthed = await verifyAdminSession(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const setting = await prisma.setting.findUnique({
      where: { key: 'admin_2fa_enabled' }
    });

    const enabled = setting?.value === 'true';
    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    console.error('2FA status error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isAuthed = await verifyAdminSession(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const body = await request.json();
    const action = body.action;

    // 1. Action: Setup (generate new secret and QR URI)
    if (action === 'setup') {
      const secret = generateTOTPSecret();
      const qrUri = getTOTPAuthUri(secret, 'admin@maytinhlmc.vn', 'LMC Invoice');
      const recoveryCodes = generateRecoveryCodes(5);

      // Create QR Code image URL via Google Charts API or quick SVG
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUri)}`;

      return NextResponse.json({
        success: true,
        secret,
        qrUri,
        qrImageUrl,
        recoveryCodes
      });
    }

    // 2. Action: Enable (verify token and save 2FA to DB)
    if (action === 'enable') {
      const { secret, token, recoveryCodes } = body;

      if (!secret || !token) {
        return NextResponse.json({ success: false, error: 'Thiếu mã Secret hoặc mã OTP' }, { status: 400 });
      }

      const isValid = verifyTOTPToken(token, secret);
      if (!isValid) {
        return NextResponse.json({ success: false, error: 'Mã OTP không chính xác. Vui lòng kiểm tra lại đồng hồ thiết bị.' }, { status: 400 });
      }

      // Save 2FA config in DB
      await prisma.$transaction([
        prisma.setting.upsert({
          where: { key: 'admin_2fa_secret' },
          update: { value: secret },
          create: { key: 'admin_2fa_secret', value: secret }
        }),
        prisma.setting.upsert({
          where: { key: 'admin_2fa_enabled' },
          update: { value: 'true' },
          create: { key: 'admin_2fa_enabled', value: 'true' }
        }),
        prisma.setting.upsert({
          where: { key: 'admin_2fa_recovery_codes' },
          update: { value: JSON.stringify(recoveryCodes || []) },
          create: { key: 'admin_2fa_recovery_codes', value: JSON.stringify(recoveryCodes || []) }
        })
      ]);

      const timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      sendTelegramSecurityAlert(
        `🛡️ *[CẢNH BÁO BẢO MẬT] ĐÃ KÍCH HOẠT XÁC THỰC 2 BƯỚC (2FA)*\n\n` +
        `✅ Xác thực 2 bước qua Google Authenticator đã được BẬT thành công.\n` +
        `⏰ Thời gian: ${timeStr}`
      ).catch(console.error);

      return NextResponse.json({
        success: true,
        message: 'Đã kích hoạt xác thực 2 bước (2FA) thành công!'
      });
    }

    // 3. Action: Disable 2FA
    if (action === 'disable') {
      const { password } = body;
      if (!password) {
        return NextResponse.json({ success: false, error: 'Vui lòng nhập mật khẩu quản trị để xác nhận' }, { status: 400 });
      }

      const hashSetting = await prisma.setting.findUnique({
        where: { key: 'admin_password_hash' }
      });

      let isPasswordValid = false;
      if (!hashSetting || !hashSetting.value) {
        isPasswordValid = password === 'admin123';
      } else {
        isPasswordValid = await bcrypt.compare(password, hashSetting.value);
      }

      if (!isPasswordValid) {
        return NextResponse.json({ success: false, error: 'Mật khẩu quản trị không chính xác' }, { status: 401 });
      }

      await prisma.setting.upsert({
        where: { key: 'admin_2fa_enabled' },
        update: { value: 'false' },
        create: { key: 'admin_2fa_enabled', value: 'false' }
      });

      const timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      sendTelegramSecurityAlert(
        `⚠️ *[CẢNH BÁO BẢO MẬT] ĐÃ TẮT XÁC THỰC 2 BƯỚC (2FA)*\n\n` +
        `❌ Xác thực 2 bước vừa bị TẮT trong trang quản trị.\n` +
        `⏰ Thời gian: ${timeStr}`
      ).catch(console.error);

      return NextResponse.json({
        success: true,
        message: 'Đã tắt xác thực 2 bước (2FA)'
      });
    }

    return NextResponse.json({ success: false, error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error) {
    console.error('2FA error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
