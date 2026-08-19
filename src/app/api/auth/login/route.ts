import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { setAdminSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập mật khẩu' }, { status: 400 });
    }

    const hashSetting = await prisma.setting.findUnique({
      where: { key: 'admin_password_hash' }
    });

    let isValid = false;

    // Nếu chưa từng đổi mật khẩu, áp dụng Password mặc định
    if (!hashSetting || !hashSetting.value) {
      isValid = password === 'admin123';
    } else {
      // So khớp mã Hash
      isValid = await bcrypt.compare(password, hashSetting.value);
    }

    if (isValid) {
      const response = NextResponse.json({ success: true, message: 'Đăng nhập thành công' });
      await setAdminSessionCookie(response);
      return response;
    } else {
      return NextResponse.json({ success: false, error: 'Mật khẩu không chính xác' }, { status: 401 });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
