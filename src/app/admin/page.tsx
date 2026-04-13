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

  // Filters State
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === id ? { ...inv, status: newStatus } : inv))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  };

  const filteredInvoices = invoices.filter(inv => {
    // Check status
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;

    // Check date range
    if (dateFrom || dateTo) {
      const invDate = new Date(inv.createdAt);
      invDate.setHours(0, 0, 0, 0); // Ignore time for correct date matching

      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (invDate < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(0, 0, 0, 0);
        if (invDate > to) return false;
      }
    }
    return true;
  });

  const handleExportExcel = async () => {
    if (filteredInvoices.length === 0) return;

    try {
      // Import library dynamically
      const XLSX = await import('xlsx');

      const headers = [
        "STT",
        "Thời gian",
        "Mã đơn hàng",
        "Mã số thuế",
        "Tên Công ty / Tổ chức",
        "Địa chỉ",
        "Email",
        "Số điện thoại",
        "Trạng thái"
      ];

      const rows = filteredInvoices.map((inv, idx) => [
        idx + 1,
        formatDate(inv.createdAt),
        inv.order_id,
        inv.tax_id,
        inv.company_name,
        inv.address,
        inv.email,
        inv.phone,
        inv.status === 'processed' ? "Đã xử lý" : inv.status === 'rejected' ? "Từ chối" : "Chờ duyệt"
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();

      // Setup beautiful column widths
      worksheet['!cols'] = [
        { wch: 5 },  // STT
        { wch: 20 }, // Thời gian
        { wch: 15 }, // Mã DH
        { wch: 15 }, // MST
        { wch: 40 }, // Công ty
        { wch: 50 }, // Địa chỉ
        { wch: 25 }, // Email
        { wch: 15 }, // Phone
        { wch: 15 }  // Status
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "YeuCauXuatHoaDon");

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `DanhSachYeuCauXuatHoaDon_${dateStr}.xlsx`);
    } catch (error) {
      console.error("Export error:", error);
      alert("Đang cài đặt thư viện Excel (xlsx). Quá trình này sẽ hoàn tất sau khi bạn Push code lên Vercel.");
    }
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-[#f9f9ff]/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm dark:shadow-none flex justify-between items-center px-6 py-4">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-[#034D9E] dark:text-[#4d90e0] tracking-tight font-headline">
              Invoice Manager <span className="text-sm font-medium text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-slate-300">Admin</span>
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
              onClick={handleExportExcel}
              disabled={filteredInvoices.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 shadow-sm rounded-lg text-white font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Xuất Excel danh sách này
            </button>
            <button
              onClick={fetchInvoices}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-outline-variant/50 shadow-sm rounded-lg text-primary font-bold hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Làm mới
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lọc Trạng thái</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
            >
              <option value="all">🌐 Tất cả trạng thái</option>
              <option value="pending">⏳ Đang chờ duyệt</option>
              <option value="processed">✅ Đã xử lý</option>
              <option value="rejected">❌ Bị từ chối</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Từ ngày</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-primary focus:ring-1 font-medium"
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đến ngày</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-primary focus:ring-1 font-medium"
            />
          </div>
          <div>
            <button
              onClick={() => { setStatusFilter("all"); setDateFrom(""); setDateTo(""); }}
              className="h-[42px] px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold rounded-lg transition-colors flex items-center justify-center border border-slate-200"
            >
              Xóa bộ lọc
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
                  <th className="px-6 py-4 font-bold">Mã số thuế</th>
                  <th className="px-6 py-4 font-bold">Công ty / Tổ chức</th>
                  <th className="px-6 py-4 font-bold">Liên hệ</th>
                  <th className="px-6 py-4 font-bold text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {loading && invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <span className="material-symbols-outlined animate-spin text-3xl text-primary mb-2">progress_activity</span>
                      <p>Đang tải dữ liệu...</p>
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">search_off</span>
                      <p>Không tìm thấy hoá đơn nào khớp với bộ lọc.</p>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className={`hover:bg-blue-50/50 transition-colors group ${inv.status === 'processed' ? 'opacity-70 bg-slate-50/50' : inv.status === 'rejected' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {formatDate(inv.createdAt)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-primary whitespace-nowrap">
                        {inv.order_id}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200 whitespace-nowrap">
                          {inv.tax_id}
                        </span>
                      </td>
                      <td className="px-6 py-4 min-w-[250px] max-w-[400px]">
                        <div className="font-bold text-on-surface whitespace-normal break-words leading-tight">{inv.company_name}</div>
                        <div className="text-xs text-slate-500 whitespace-normal break-words mt-1.5">{inv.address}</div>
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
                        <select
                          value={inv.status}
                          onChange={(e) => handleUpdateStatus(inv.id, e.target.value)}
                          className={`font-bold outline-none cursor-pointer appearance-none rounded-full px-4 py-1.5 text-xs text-center border shadow-sm transition-all ${inv.status === 'processed'
                            ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                            : inv.status === 'rejected'
                              ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                              : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
                            }`}
                        >
                          <option className="bg-white text-amber-700 font-bold" value="pending">⏳ Chờ duyệt</option>
                          <option className="bg-white text-green-700 font-bold" value="processed">✅ Đã xử lý</option>
                          <option className="bg-white text-red-700 font-bold" value="rejected">❌ Từ chối</option>
                        </select>
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
