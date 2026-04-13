import { NextResponse } from 'next/server';

let siteSettings = {
  guideTitle: "Hướng dẫn Yêu cầu hoá đơn",
  guideContent: "1. Điền chính xác Mã đơn hàng của bạn.\n2. Cung cấp Mã số thuế, hệ thống sẽ tự động tra cứu Tên Công ty/Tổ chức theo hệ thống Cổng thông tin Quốc gia.\n3. Điền Email thật để nhận Hoá đơn điện tử (định dạng PDF/XML).",
  supportTitle: "Hỗ trợ nhanh",
  supportContent: "Hotline: 1900 xxxx (Bấm phím 1)\nZalo Hỗ trợ: 09xx xxx xxx\nEmail Kế toán: ketoan@company.com\n\nThời gian làm việc:\nSáng: 08:30 - 12:00\nChiều: 13:30 - 18:00 (Từ Thứ 2 - Thứ 6)."
};

export async function GET() {
  return NextResponse.json({ success: true, data: siteSettings });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    siteSettings = { ...siteSettings, ...body };
    return NextResponse.json({ success: true, data: siteSettings });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}
