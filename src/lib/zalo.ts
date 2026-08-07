import prisma from '@/lib/prisma';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ZaloConfig {
  app_id: string;
  app_secret: string;
  access_token: string;
  refresh_token: string;
  template_new: string;
  template_status: string;
}

interface ZaloTokenResponse {
  access_token?: string;
  refresh_token?: string;
  error?: number | string;
  message?: string;
}

interface ZaloSendResponse {
  error: number | string;
  message?: string;
  data?: { msg_id?: string };
}

// ─── Config Reader ──────────────────────────────────────────────────────────

async function getZaloConfig(): Promise<ZaloConfig | null> {
  const keys = [
    'zalo_app_id',
    'zalo_app_secret',
    'zalo_access_token',
    'zalo_refresh_token',
    'zalo_template_new',
    'zalo_template_status',
  ];

  const settings = await prisma.setting.findMany({
    where: { key: { in: keys } },
  });

  const map: Record<string, string> = {};
  settings.forEach((s) => {
    map[s.key] = s.value;
  });

  if (!map['zalo_app_id'] || !map['zalo_app_secret'] || !map['zalo_refresh_token']) {
    return null;
  }

  return {
    app_id: map['zalo_app_id'],
    app_secret: map['zalo_app_secret'],
    access_token: map['zalo_access_token'] || '',
    refresh_token: map['zalo_refresh_token'],
    template_new: map['zalo_template_new'] || '',
    template_status: map['zalo_template_status'] || '',
  };
}

// ─── Mutex / Promise Caching (chống Race Condition) ────────────────────────

let refreshingPromise: Promise<string | null> | null = null;

// ─── Refresh Token ──────────────────────────────────────────────────────────

async function refreshZaloToken(config: ZaloConfig): Promise<string | null> {
  if (refreshingPromise) {
    return refreshingPromise;
  }

  refreshingPromise = (async () => {
    try {
      const res = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          secret_key: config.app_secret,
        },
        body: new URLSearchParams({
          app_id: config.app_id,
          grant_type: 'refresh_token',
          refresh_token: config.refresh_token,
        }),
      });

      const data: ZaloTokenResponse = await res.json();

      if (!data.access_token || !data.refresh_token) {
        console.error('[Zalo] Refresh token thất bại:', data);
        return null;
      }

      await Promise.all([
        prisma.setting.upsert({
          where: { key: 'zalo_access_token' },
          update: { value: data.access_token },
          create: { key: 'zalo_access_token', value: data.access_token },
        }),
        prisma.setting.upsert({
          where: { key: 'zalo_refresh_token' },
          update: { value: data.refresh_token },
          create: { key: 'zalo_refresh_token', value: data.refresh_token },
        }),
        prisma.setting.upsert({
          where: { key: 'zalo_token_updated_at' },
          update: { value: new Date().toISOString() },
          create: { key: 'zalo_token_updated_at', value: new Date().toISOString() },
        }),
      ]);

      console.log('[Zalo] Refresh token thành công.');
      return data.access_token;
    } catch (err) {
      console.error('[Zalo] Lỗi mạng khi refresh token:', err);
      return null;
    } finally {
      refreshingPromise = null;
    }
  })();

  return refreshingPromise;
}

// ─── Format Phone Number (Zalo requires 84xxx format) ────────────────────────
function formatZaloPhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+84')) return '84' + cleaned.slice(3);
  if (cleaned.startsWith('0')) return '84' + cleaned.slice(1);
  if (cleaned.startsWith('84')) return cleaned;
  return '84' + cleaned;
}

// ─── Hàm Gửi ZNS Chính ─────────────────────────────────────────────────────

async function sendZaloZNS(
  phone: string,
  templateId: string,
  templateData: Record<string, string>,
  config: ZaloConfig,
  retried = false
): Promise<{ success: boolean; error_code?: string; error_msg?: string }> {
  try {
    const formattedPhone = formatZaloPhone(phone);
    
    const payload = JSON.stringify({
      phone: formattedPhone,
      template_id: templateId,
      template_data: templateData,
      tracking_id: `inv_${Date.now()}`,
    });

    let res: Response | null = null;
    let fetchError: any = null;
    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
      try {
        res = await fetch('https://business.openapi.zalo.me/message/template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            access_token: config.access_token,
          },
          body: payload,
        });
        break; // fetch thành công
      } catch (err: any) {
        fetchError = err;
        attempt++;
        if (attempt < maxRetries) {
          console.warn(`[Zalo] Lỗi mạng khi gửi ZNS (lần ${attempt}): ${err.message}. Đang thử lại...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    if (!res) {
      console.error('[Zalo] Lỗi mạng sau 3 lần thử:', fetchError);
      return { success: false, error_msg: `NETWORK_ERROR: ${fetchError?.message}` };
    }

    const result: ZaloSendResponse = await res.json();

    // Quan trọng: ép kiểu về Number trước khi so sánh -216
    if (Number(result.error) === -216 && !retried) {
      const newToken = await refreshZaloToken(config);
      if (newToken) {
        return sendZaloZNS(
          phone,
          templateId,
          templateData,
          { ...config, access_token: newToken },
          true
        );
      }
      return { success: false, error_code: '-216', error_msg: 'Token hết hạn và refresh thất bại' };
    }

    if (Number(result.error) === 0) {
      return { success: true };
    }

    return {
      success: false,
      error_code: String(result.error),
      error_msg: result.message,
    };
  } catch (err) {
    console.error('[Zalo] Lỗi mạng khi gửi ZNS:', err);
    return { success: false, error_code: 'NETWORK_ERROR', error_msg: String(err) };
  }
}

// ─── Helper: Lưu log vào DB ─────────────────────────────────────────────────

async function logZaloResult(
  invoiceId: string,
  orderId: string,
  phone: string,
  templateId: string,
  result: { success: boolean; error_code?: string; error_msg?: string }
) {
  try {
    await prisma.zaloLog.create({
      data: {
        invoice_id: invoiceId,
        order_id: orderId,
        phone,
        template_id: templateId,
        success: result.success,
        error_code: result.error_code ?? null,
        error_msg: result.error_msg ?? null,
      },
    });
  } catch (err) {
    console.error('[Zalo] Không thể lưu log:', err);
  }
}

// ─── Public APIs ────────────────────────────────────────────────────────────

/** Gửi thông báo khi có yêu cầu hoá đơn MỚI */
export async function sendNewInvoiceNotification(invoice: {
  id: string;
  order_id: string;
  phone: string;
  company_name: string;
  tax_id: string;
  address: string;
  email: string;
}) {
  const config = await getZaloConfig();
  if (!config || !config.template_new) {
    console.warn('[Zalo] Chưa cấu hình Zalo ZNS hoặc thiếu Template New ID.');
    return;
  }

  const result = await sendZaloZNS(
    invoice.phone,
    config.template_new,
    {
      order_id: invoice.order_id,
      tax_code: invoice.tax_id,
      company_name: invoice.company_name,
      tax_address: invoice.address,
      phone_number: invoice.phone,
      customer_email: invoice.email,
    },
    config
  );

  await logZaloResult(invoice.id, invoice.order_id, invoice.phone, config.template_new, result);
}

/** Gửi thông báo khi Admin CẬP NHẬT trạng thái */
export async function sendStatusUpdateNotification(
  invoice: {
    id: string;
    order_id: string;
    phone: string;
    company_name: string;
  },
  newStatus: string
) {
  const config = await getZaloConfig();
  if (!config || !config.template_status) {
    console.warn('[Zalo] Chưa cấu hình Zalo ZNS hoặc thiếu Template Status ID.');
    return;
  }

  const statusMap: Record<string, string> = {
    processed: 'Đã hoàn thành',
    rejected: 'Đã từ chối',
    pending: 'Đang chờ xử lý',
  };

  const result = await sendZaloZNS(
    invoice.phone,
    config.template_status,
    {
      order_id: invoice.order_id,
      status_text: statusMap[newStatus] ?? newStatus,
    },
    config
  );

  await logZaloResult(invoice.id, invoice.order_id, invoice.phone, config.template_status, result);
}

/** Gửi thông báo TEST */
export async function sendTestNotification(phone: string, templateId: string, type: 'new' | 'status') {
  const config = await getZaloConfig();
  if (!config) {
    return { success: false, error_msg: "Chưa cấu hình Zalo OA" };
  }

  const templateData: Record<string, string> = type === 'new'
    ? {
      order_id: 'TEST-ORD-001',
      tax_code: '0101234567',
      company_name: 'Công ty cổ phần thiết bị công nghệ LMC',
      tax_address: 'Số 472 Đại Lộ Lê Thanh Nghị, P. Lê Thanh Nghị, TP. Hải Dương, Hải Phòng',
      phone_number: phone,
      customer_email: 'test@email.com',
    }
    : {
      order_id: 'TEST-ORD-001',
      status_text: 'Đã hoàn thành',
    };

  const result = await sendZaloZNS(phone, templateId, templateData, config);

  // Log it
  await logZaloResult('test', 'TEST-ORD-001', phone, templateId, result);

  return result;
}

/** Đọc toàn bộ cấu hình Zalo (dùng cho Admin API) */
export async function getZaloSettings() {
  const keys = [
    'zalo_app_id',
    'zalo_app_secret',
    'zalo_access_token',
    'zalo_refresh_token',
    'zalo_template_new',
    'zalo_template_status',
    'zalo_token_updated_at',
  ];
  const settings = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map: Record<string, string> = {};
  settings.forEach((s) => { map[s.key] = s.value; });
  return map;
}

/** Lưu cấu hình Zalo + kích hoạt refresh token ngay */
export async function saveZaloSettings(data: Record<string, string>): Promise<{ success: boolean; message: string }> {
  for (const [key, value] of Object.entries(data)) {
    if (value) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
  }

  // Kích hoạt refresh token ngay nếu có đủ thông tin
  const shouldRefresh = data['zalo_app_id'] || data['zalo_app_secret'] || data['zalo_refresh_token'];
  if (shouldRefresh) {
    const config = await getZaloConfig();
    if (config) {
      const newToken = await refreshZaloToken(config);
      if (!newToken) {
        return { success: false, message: 'Lưu cấu hình thành công nhưng refresh token thất bại. Kiểm tra lại App Secret và Refresh Token.' };
      }
      return { success: true, message: 'Lưu thành công và đã lấy Access Token mới!' };
    }
  }

  return { success: true, message: 'Lưu cấu hình thành công.' };
}

export { refreshZaloToken, getZaloConfig };
