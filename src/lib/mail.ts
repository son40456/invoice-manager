import nodemailer from 'nodemailer';

export async function sendConfirmationEmail(invoiceData: any) {
  const { order_id, email, company_name, tax_id, address, phone } = invoiceData;
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
          Hệ thống của chúng tôi đã ghi nhận thành công yêu cầu xuất hoá đơn của quý khách cho <strong>Mã đơn hàng: ${order_id}</strong>. Dưới đây là thông tin chi tiết:
        </p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #0068FF; padding: 20px; margin: 24px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">THÔNG TIN XUẤT HOÁ ĐƠN</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px; font-size: 14px;">Mã số thuế:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 15px;">${tax_id}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Tên đơn vị:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 15px;">${company_name}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 14px; vertical-align: top;">Địa chỉ:</td>
              <td style="padding: 6px 0; color: #0f172a; font-size: 15px; line-height: 1.4;">${address}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Email nhận HĐ:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 15px;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Liên hệ (SĐT):</td>
              <td style="padding: 6px 0; color: #0f172a; font-size: 15px;">${phone}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 16px; color: #334155; line-height: 1.6;">
          Bộ phận Kế toán sẽ tiến hành kiểm tra và gửi Hoá đơn điện tử sang email này trong vòng <strong>24-48 giờ làm việc</strong>. Trong trường hợp thông tin cần làm rõ, chúng tôi sẽ sớm liên hệ trực tiếp qua số điện thoại cung cấp.
        </p>
        
        <p style="font-size: 14px; color: #64748b; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
          * Xin lưu ý: Đây là email hệ thống gửi tự động, vui lòng không trả lời thư này. Mọi thắc mắc xin vui lòng liên hệ bộ phận CSKH.
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Hệ thống Xuất Hoá Đơn" <${SMTP_USER}>`,
    to: email,
    subject: `Xác nhận Yêu cầu Hoá Đơn Điện Tử - Mã đơn: ${order_id}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Confirmation Email sent: %s", info.messageId);
  } catch (error) {
    console.error("Lỗi gửi Email Nodemailer:", error);
  }
}
