"use client";

import { useEffect, useState } from "react";

interface InvoiceRequest {
  id: string;
  order_id: string;
  tax_id: string;
  company_name: string;
  address: string;
  email: string;
  phone: string;
  createdAt: string;
  status: string;
}

export default function AdminDashboard() {
  const [invoices, setInvoices] = useState<InvoiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
    
    // Auto refresh every 10 seconds to feel live
    const interval = setInterval(fetchInvoices, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/invoices");
      const json = await res.json();
      if (json.success) {
        setInvoices(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-[#f9f9ff]/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm dark:shadow-none flex justify-between items-center px-6 py-4">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-[#034D9E] dark:text-[#4d90e0] tracking-tight font-headline">
              Ledger <span className="text-sm font-medium text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-slate-300">Admin</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold text-primary">
            Quản lý Phiếu Yêu Cầu
            <span className="material-symbols-outlined text-slate-600 scale-95 cursor-pointer hover:bg-slate-200 p-2 rounded-full transition-all">
              settings
            </span>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-28 pb-20 px-4 md:px-8 max-w-7xl mx-auto min-h-screen">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-primary tracking-tight mb-2">
              Danh sách Yêu cầu Xuất Hoá đơn
            </h1>
            <p className="text-on-surface-variant font-body text-sm md:text-base">
              Theo dõi và xử lý các yêu cầu được gửi từ khách hàng. Dữ liệu sẽ tự động làm mới.
            </p>
          </div>
          <div className="hidden md:flex gap-3">
            <button 
              onClick={fetchInvoices}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-outline-variant/50 shadow-sm rounded-lg text-primary font-bold hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Làm mới
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-sm">
              <thead className="bg-[#f0f4f8] text-slate-600 border-b border-outline-variant/40 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 font-bold">Thời gian</th>
                  <th className="px-6 py-4 font-bold">Mã đơn hàng</th>
                  <th className="px-6 py-4 font-bold">Công ty / Tổ chức</th>
                  <th className="px-6 py-4 font-bold">Mã số thuế</th>
                  <th className="px-6 py-4 font-bold">Liên hệ</th>
                  <th className="px-6 py-4 font-bold text-center">Trạng thái</th>
                  <th className="px-6 py-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {loading && invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <span className="material-symbols-outlined animate-spin text-3xl text-primary mb-2">progress_activity</span>
                      <p>Đang tải dữ liệu...</p>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inbox</span>
                      <p>Chưa có yêu cầu xuất hoá đơn nào.</p>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-blue-50/50 transition-colors group">
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {formatDate(inv.createdAt)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-primary">
                        {inv.order_id}
                      </td>
                      <td className="px-6 py-4 max-w-[200px] truncate" title={inv.company_name}>
                        <div className="font-bold text-on-surface">{inv.company_name}</div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">{inv.address}</div>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
                          {inv.tax_id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <a href={`mailto:${inv.email}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">mail</span> {inv.email}
                          </a>
                          <a href={`tel:${inv.phone}`} className="text-xs text-slate-600 hover:underline flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">phone</span> {inv.phone}
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Chờ duyệt
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Đánh dấu đã xuất">
                          <span className="material-symbols-outlined text-xl">check_circle</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
