import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập mật khẩu' }, { status: 400 });
    }

    const hashSetting = await prisma.setting.findUnique({
      where: { key: 'admin_password_hash' }
    });

    // Nếu chưa từng đổi mật khẩu, áp dụng Password mặc định
    if (!hashSetting || !hashSetting.value) {
      if (password === 'admin123') {
        return NextResponse.json({ success: true, message: 'Đăng nhập thành công' });
      }
      return NextResponse.json({ success: false, error: 'Mật khẩu không chính xác' }, { status: 401 });
    }

    // So khớp mã Hash
    const isValid = await bcrypt.compare(password, hashSetting.value);
    
    if (isValid) {
      return NextResponse.json({ success: true, message: 'Đăng nhập thành công' });
    } else {
      return NextResponse.json({ success: false, error: 'Mật khẩu không chính xác' }, { status: 401 });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
