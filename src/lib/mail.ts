import nodemailer from 'nodemailer';

export async function sendConfirmationEmail(toEmail: string, orderId: string, companyName: string) {
  const { SMTP_USER, SMTP_PASSWORD } = process.env;

  if (!SMTP_USER || !SMTP_PASSWORD) {
    console.error("Missing SMTP credentials in .env");
    return;
  }

  // Create reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background-color: #0068FF; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Đã ghi nhận yêu cầu Hoá Đơn</h1>
      </div>
      <div style="padding: 32px 24px;">
        <p style="font-size: 16px; color: #334155; line-height: 1.6; margin-top: 0;">
          Xin chào,
        </p>
        <p style="font-size: 16px; color: #334155; line-height: 1.6;">
          Hệ thống của chúng tôi đã ghi nhận thành công yêu cầu xuất hoá đơn của quý khách cho <strong>Mã đơn hàng: ${orderId}</strong>.
        </p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #0068FF; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">Công ty / Tổ chức yêu cầu:</p>
          <p style="margin: 0; font-weight: bold; color: #0f172a; font-size: 16px;">${companyName}</p>
        </div>

        <p style="font-size: 16px; color: #334155; line-height: 1.6;">
          Bộ phận Kế toán sẽ tiền hành kiểm tra và gửi Hoá đơn điện tử ngõ sang email này trong vòng <strong>24-48 giờ làm việc</strong>. Trong trường hợp thông tin cần làm rõ, chúng tôi sẽ sớm liên hệ trực tiếp.
        </p>
        
        <p style="font-size: 14px; color: #64748b; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
          * Xin lưu ý: Đây là email hệ thống gửi tự động, vui lòng không trả lời thư này. Mọi thắc mắc xin vui lòng liên hệ bộ phận CSKH.
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Hệ thống Xuất Hoá Đơn" <${SMTP_USER}>`,
    to: toEmail,
    subject: `Xác nhận Yêu cầu Hoá Đơn Điện Tử - Mã đơn: ${orderId}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Confirmation Email sent: %s", info.messageId);
  } catch (error) {
    console.error("Lỗi gửi Email Nodemailer:", error);
  }
}
