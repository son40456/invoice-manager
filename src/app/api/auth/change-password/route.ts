import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'Vui lòng điền đủ mật khẩu cũ và mới' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Mật khẩu mới phải có tối thiểu 6 ký tự' }, { status: 400 });
    }

    const hashSetting = await prisma.setting.findUnique({
      where: { key: 'admin_password_hash' }
    });

    // So khớp mật khẩu hiện tại
    let isCurrentValid = false;
    if (!hashSetting || !hashSetting.value) {
      isCurrentValid = currentPassword === 'admin123';
    } else {
      isCurrentValid = await bcrypt.compare(currentPassword, hashSetting.value);
    }

    if (!isCurrentValid) {
      return NextResponse.json({ success: false, error: 'Mật khẩu hiện tại không chính xác' }, { status: 401 });
    }

    // Băm mật khẩu mới (Mã Hóa - 10 vòng muối)
    const newHash = await bcrypt.hash(newPassword, 10);

    // Cập nhật Database
    await prisma.setting.upsert({
      where: { key: 'admin_password_hash' },
      update: { value: newHash },
      create: { key: 'admin_password_hash', value: newHash }
    });

    return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công!' });
    
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
