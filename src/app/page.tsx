"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function InvoiceScreen() {
  const [formData, setFormData] = useState({
    order_id: "",
    tax_id: "",
    company_name: "",
    address: "",
    email: "",
    phone: "",
  });

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [siteSettings, setSiteSettings] = useState({
    guideTitle: "Hướng dẫn Yêu cầu hoá đơn",
    guideContent: "Đang tải dữ liệu...",
    supportTitle: "Hỗ trợ nhanh",
    supportContent: "Đang tải dữ liệu...",
    zaloGroupLink: "",
    zaloGroupQrUrl: ""
  });

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSiteSettings(data.data);
        }
      })
      .catch(err => console.error("Error loading settings:", err));
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    const val = formData.tax_id.trim();
    if (val.length >= 10 && val.length <= 14) {
      setIsLookingUp(true);
      const lookupTimeout = setTimeout(async () => {
        try {
          const response = await fetch(`https://api.xinvoice.vn/gdt-api/tax-payer/${val}`);
          if (response.ok) {
            const data = await response.json();
            if (data && data.name) {
              setFormData((prev) => ({
                ...prev,
                company_name: data.name,
                address: data.address,
              }));
              showToast("Đã lấy thông tin doanh nghiệp", "success");
            } else {
              showToast("Không tìm thấy thông tin doanh nghiệp (MST có thể sai)", "error");
            }
          } else if (response.status === 404) {
            showToast("Không tìm thấy thông tin doanh nghiệp cho MST này", "error");
          } else {
            console.log("Lookup error:", response.status);
          }
        } catch (error) {
          console.error("Lỗi khi lấy thông tin MST:", error);
        } finally {
          setIsLookingUp(false);
        }
      }, 800);
      return () => clearTimeout(lookupTimeout);
    } else {
      setIsLookingUp(false);
    }
  }, [formData.tax_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;
    if (!phoneRegex.test(formData.phone)) {
      showToast("Số điện thoại không hợp lệ", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showToast("Đã gửi yêu cầu xuất hóa đơn thành công!", "success");
        setFormData({ order_id: "", tax_id: "", company_name: "", address: "", email: "", phone: "" });
      } else {
        showToast("Có lỗi xảy ra, vui lòng thử lại!", "error");
      }
    } catch (error) {
      console.error("Submit error:", error);
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-[#f9f9ff]/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm dark:shadow-none flex justify-between items-center px-6 py-4">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-[#034D9E] dark:text-[#4d90e0] tracking-tight font-headline">
              Invoice Manager
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-slate-600 scale-95 active:duration-150 cursor-pointer">
              account_circle
            </span>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-24 pb-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10 text-center md:text-left">
            <h1 className="font-headline font-extrabold text-4xl md:text-5xl text-primary tracking-tight mb-2">
              Thông tin xuất hoá đơn
            </h1>
            <p className="text-on-surface-variant font-body text-base max-w-2xl">
              Vui lòng cung cấp đầy đủ và chính xác thông tin bên dưới để quá trình xuất hóa đơn diễn ra thuận lợi.
            </p>
          </div>

          <div className="mb-8 p-6 bg-primary/5 border border-primary/10 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="mt-1 w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-2xl">info</span>
              </div>
              <div>
                <h2 className="font-headline font-bold text-xl text-primary mb-3">{siteSettings.guideTitle}</h2>
                <div className="space-y-3 font-body text-on-surface-variant leading-relaxed whitespace-pre-line">
                  {siteSettings.guideContent}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-8 bg-surface-container-low rounded-xl p-8 md:p-10 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-label text-sm font-semibold text-on-surface" htmlFor="order_id">
                      Mã đơn hàng <span className="text-error">*</span>
                    </label>
                    <span className="material-symbols-outlined text-outline text-sm cursor-help" title="Mã đơn hàng trên Shopee của bạn">
                      info
                    </span>
                  </div>
                  <input
                    className="w-full h-12 px-4 bg-surface-container-lowest border-0 rounded-xl text-on-surface ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-primary/40 transition-all font-body"
                    id="order_id"
                    name="order_id"
                    placeholder="Ví dụ: 231025XXXXXXXX"
                    required
                    type="text"
                    value={formData.order_id}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-on-surface-variant/70 italic">Mã đơn hàng trên Shopee của bạn</p>
                </div>

                <div className="space-y-2">
                  <label className="font-label text-sm font-semibold text-on-surface" htmlFor="tax_id">
                    Mã số thuế <span className="text-error">*</span>
                  </label>
                  <input
                    className={`w-full h-12 px-4 bg-surface-container-lowest border-0 rounded-xl text-on-surface ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-primary/40 transition-all font-body ${isLookingUp ? "opacity-50 pointer-events-none" : ""
                      }`}
                    id="tax_id"
                    name="tax_id"
                    placeholder="01XXXXXXXX"
                    required
                    type="text"
                    value={formData.tax_id}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-label text-sm font-semibold text-on-surface" htmlFor="company_name">
                    Tên công ty / Hộ kinh doanh / Cá nhân <span className="text-error">*</span>
                  </label>
                  <input
                    className="w-full h-12 px-4 bg-surface-container-lowest border-0 rounded-xl text-on-surface ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-primary/40 transition-all font-body"
                    id="company_name"
                    name="company_name"
                    placeholder="Nhập tên đầy đủ..."
                    required
                    type="text"
                    value={formData.company_name}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-on-surface-variant/70 italic">
                    Tuỳ theo bạn muốn xuất hoá đơn cho công ty, hộ kinh doanh, hay cá nhân
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="font-label text-sm font-semibold text-on-surface" htmlFor="address">
                    Địa chỉ <span className="text-error">*</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-3 bg-surface-container-lowest border-0 rounded-xl text-on-surface ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-primary/40 transition-all font-body"
                    id="address"
                    name="address"
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                    required
                    rows={3}
                    value={formData.address}
                    onChange={handleChange}
                  ></textarea>
                  <p className="text-xs text-on-surface-variant/70 italic">Địa chỉ kinh doanh theo địa chỉ hành chính mới</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-label text-sm font-semibold text-on-surface" htmlFor="email">
                      Email <span className="text-error">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-lg">
                        mail
                      </span>
                      <input
                        className="w-full h-12 pl-12 pr-4 bg-surface-container-lowest border-0 rounded-xl text-on-surface ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-primary/40 transition-all font-body"
                        id="email"
                        name="email"
                        placeholder="example@gmail.com"
                        required
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>
                    <p className="text-xs text-on-surface-variant/70 italic">Email nhận hoá đơn</p>
                  </div>
                  <div className="space-y-2">
                    <label className="font-label text-sm font-semibold text-on-surface" htmlFor="phone">
                      Số điện thoại <span className="text-error">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-lg">
                        phone
                      </span>
                      <input
                        className="w-full h-12 pl-12 pr-4 bg-surface-container-lowest border-0 rounded-xl text-on-surface ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-primary/40 transition-all font-body"
                        id="phone"
                        name="phone"
                        placeholder="09xxxxxxxx"
                        required
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>
                    <p className="text-xs text-on-surface-variant/70 italic">Liên hệ khi có vấn đề cần trao đổi</p>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    disabled={isSubmitting}
                    className="w-full md:w-auto px-10 py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-full font-headline font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed"
                    type="submit"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        Gửi yêu cầu xuất hoá đơn
                        <span className="material-symbols-outlined">send</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="md:col-span-4 space-y-6">
              <div className="bg-tertiary-container/10 p-6 rounded-xl border border-tertiary-container/20">
                <div className="flex items-center gap-2 mb-2 text-tertiary-fixed-dim">
                  <span className="material-symbols-outlined">help_center</span>
                  <span className="font-bold font-headline">{siteSettings.supportTitle}</span>
                </div>
                <div className="text-sm font-body text-on-surface-variant whitespace-pre-line leading-relaxed">
                  {siteSettings.supportContent}
                </div>

                {(siteSettings.zaloGroupLink || siteSettings.zaloGroupQrUrl) && (
                  <div className="mt-5 pt-5 border-t border-tertiary-container/20 flex flex-col items-center gap-4 text-center">
                    {siteSettings.zaloGroupQrUrl && (
                      <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={siteSettings.zaloGroupQrUrl} alt="Zalo QR Code" className="w-[120px] h-[120px] object-contain" />
                      </div>
                    )}
                    {siteSettings.zaloGroupLink && (
                      <a href={siteSettings.zaloGroupLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-2.5 bg-[#0068FF] text-white rounded-full font-bold text-sm shadow-md hover:shadow-lg transition-all w-full justify-center">
                        <span className="material-symbols-outlined text-[18px]">group_add</span>
                        Tham gia Nhóm Zalo Hỗ trợ
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">description</span>
                  </div>
                  <h3 className="font-headline font-bold text-on-surface">Lưu ý quan trọng</h3>
                </div>
                <ul className="space-y-4 font-body text-sm text-on-surface-variant">
                  <li className="flex gap-3">
                    <span className="material-symbols-outlined text-primary-container text-lg">check_circle</span>
                    <span>Hoá đơn điện tử sẽ được gửi qua Email bạn đã đăng ký trong vòng 24-48h làm việc.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="material-symbols-outlined text-primary-container text-lg">check_circle</span>
                    <span>Kiểm tra kỹ Mã số thuế và Địa chỉ trước khi gửi. Hệ thống không hỗ trợ điều chỉnh sau khi đã phát hành.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="material-symbols-outlined text-primary-container text-lg">check_circle</span>
                    <span>Đối với hộ kinh doanh cá thể, vui lòng cung cấp đúng tên chủ hộ và địa điểm kinh doanh.</span>
                  </li>
                </ul>
              </div>

              <div className="relative rounded-xl overflow-hidden aspect-video group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Professional accounting documentation"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiJRJ3c9ui7ZkPIFA-QDo5ZCzRl3MsE4Q-O2PevM-3lBlI0OgdusqhTiB6laYlmsey1eDSNjgajUkNn0bUJixkhYoO6zne24OhRAy_CUWNHBx2tr9x3857VxwyASeiNzBXUxlLkVAea90BZGvTeinIyTsn7vDF6HFvHMj4sk9m2pOEIbnIUhR8kTbPVYv3nhmyOgGHWGAt9Gr3y9NrpXWgHZ6R4hg6JKmcFLrdLt9wfpf8Gziuu6uULqrx5r4K4e_iZpfugVGe-2iA"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent flex items-end p-6">
                  <p className="text-white font-headline font-bold text-lg leading-tight">
                    Chứng từ chính xác, <br />Vận hành chuyên nghiệp.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto py-10 bg-surface-container-high/30">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-[#034D9E]/60 tracking-tight font-headline">LMC Invoice Manager</span>
            <span className="text-on-surface-variant/40 text-sm">© 2026 - LMC - SONBN </span>
          </div>
          <div className="flex gap-8">
            <a className="text-on-surface-variant/60 hover:text-primary transition-colors text-sm font-label" href="#">
              Chính sách bảo mật
            </a>
            <a className="text-on-surface-variant/60 hover:text-primary transition-colors text-sm font-label" href="#">
              Điều khoản sử dụng
            </a>
          </div>
        </div>
      </footer>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-xl border shadow-lg transform transition-all duration-300 ${toast.type === "success"
              ? "bg-[#f0fdf4] border-[#bbf7d0]"
              : "bg-[#fef2f2] border-[#fecaca]"
              }`}
          >
            <span
              className={`material-symbols-outlined ${toast.type === "success" ? "text-green-600" : "text-red-600"
                }`}
            >
              {toast.type === "success" ? "check_circle" : "error"}
            </span>
            <p
              className={`font-body font-medium ${toast.type === "success" ? "text-green-800" : "text-red-800"
                }`}
            >
              {toast.message}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
