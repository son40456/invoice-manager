import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const isAuthed = await verifyAdminSession(request);
    if (!isAuthed) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Yêu cầu quyền quản trị viên' }, { status: 401 });
    }

    const logs = await prisma.zaloLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching Zalo logs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch logs' }, { status: 500 });
  }
}
