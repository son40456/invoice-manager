"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import logo from "../../logo.png";

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
  const [statusFilter, setStatusFilter] = useState("pending");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Tabs and Settings State
  const [activeTab, setActiveTab] = useState("list");
  const [siteSettings, setSiteSettings] = useState({
    guideTitle: "",
    guideContent: "",
    supportTitle: "",
    supportContent: "",
    zaloGroupLink: "",
    zaloGroupQrUrl: ""
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Zalo ZNS State
  const [zaloSettings, setZaloSettings] = useState({
    zalo_app_id: "",
    zalo_app_secret: "",
    zalo_access_token: "",
    zalo_refresh_token: "",
    zalo_refresh_token_masked: "",
    zalo_template_new: "",
    zalo_template_status: "",
  });
  const [zaloTokenUpdatedAt, setZaloTokenUpdatedAt] = useState("");
  const [savingZalo, setSavingZalo] = useState(false);
  const [zaloSaveMsg, setZaloSaveMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [zaloLogs, setZaloLogs] = useState<{
    id: string; phone: string; order_id: string; template_id: string;
    success: boolean; error_code: string | null; error_msg: string | null; createdAt: string;
  }[]>([]);
  const [loadingZaloLogs, setLoadingZaloLogs] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  // Test Zalo State
  const [testFormOpen, setTestFormOpen] = useState<string | null>(null); // 'new' | 'status'
  const [testPhone, setTestPhone] = useState("");
  const [testingZalo, setTestingZalo] = useState(false);

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "" });
  const [changingPass, setChangingPass] = useState(false);

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; orderId: string }>({ open: false, id: "", orderId: "" });
  const [deleting, setDeleting] = useState(false);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 1800);
    });
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.newPass) return alert("Vui lòng điền đủ mật khẩu cũ và mới");
    setChangingPass(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.newPass })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setPasswordForm({ current: "", newPass: "" });
      } else {
        alert(data.error || "Có lỗi xảy ra");
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setChangingPass(false);
    }
  };

  useEffect(() => {
    // Auth Check
    const isAuthed = localStorage.getItem("ledger_admin_auth");
    if (!isAuthed) {
      window.location.href = "/admin/login";
      return;
    }

    fetchInvoices();
    fetchSettings();
    fetchZaloSettings();
    fetchZaloLogs();

    // Auto refresh every 10 seconds to feel live
    const interval = setInterval(fetchInvoices, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success) setSiteSettings(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchZaloSettings = async () => {
    try {
      const res = await fetch("/api/zalo");
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setZaloSettings(prev => ({
          ...prev,
          zalo_app_id: d.zalo_app_id || "",
          zalo_access_token: d.zalo_access_token || "",
          zalo_refresh_token: d.zalo_refresh_token || "",
          zalo_refresh_token_masked: d.zalo_refresh_token || "",
          zalo_template_new: d.zalo_template_new || "",
          zalo_template_status: d.zalo_template_status || "",
        }));
        setZaloTokenUpdatedAt(d.zalo_token_updated_at || "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchZaloLogs = async () => {
    setLoadingZaloLogs(true);
    try {
      const res = await fetch("/api/zalo/logs");
      const json = await res.json();
      if (json.success) setZaloLogs(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingZaloLogs(false);
    }
  };

  const handleSaveZalo = async () => {
    setSavingZalo(true);
    setZaloSaveMsg(null);
    try {
      const res = await fetch("/api/zalo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(zaloSettings),
      });
      const json = await res.json();
      setZaloSaveMsg({ ok: json.success, msg: json.message });
      if (json.success) {
        await fetchZaloSettings();
        await fetchZaloLogs();
      }
    } catch (err) {
      setZaloSaveMsg({ ok: false, msg: "Lỗi kết nối máy chủ" });
    } finally {
      setSavingZalo(false);
    }
  };

  const handleManualRefresh = async () => {
    setManualRefreshing(true);
    setZaloSaveMsg(null);
    try {
      const res = await fetch("/api/cron/zalo-refresh");
      const json = await res.json();
      setZaloSaveMsg({ ok: json.success, msg: json.message });
      if (json.success) await fetchZaloSettings();
    } catch (err) {
      setZaloSaveMsg({ ok: false, msg: "Lỗi kết nối máy chủ" });
    } finally {
      setManualRefreshing(false);
    }
  };

  const handleTestZalo = async (type: 'new' | 'status') => {
    if (!testPhone) return alert("Vui lòng nhập số điện thoại");
    const templateId = type === 'new' ? zaloSettings.zalo_template_new : zaloSettings.zalo_template_status;
    if (!templateId) return alert("Vui lòng lưu Template ID trước khi test");

    setTestingZalo(true);
    try {
      const res = await fetch("/api/zalo/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, templateId, type })
      });
      const json = await res.json();
      if (json.success) {
        alert("Gửi thành công! Vui lòng kiểm tra Zalo.");
        setTestFormOpen(null);
        setTestPhone("");
        fetchZaloLogs();
      } else {
        alert("Lỗi: " + (json.error_msg || json.message || "Gửi thất bại"));
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setTestingZalo(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(siteSettings),
      });
      if (res.ok) alert("Đã lưu cấu hình thành công!");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

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

  const handleDeleteInvoice = async (id: string, orderId: string) => {
    setDeleteModal({ open: true, id, orderId });
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteModal.id })
      });
      if (res.ok) {
        setInvoices((prev) => prev.filter((inv) => inv.id !== deleteModal.id));
        setDeleteModal({ open: false, id: "", orderId: "" });
      } else {
        alert("Xóa thất bại. Vui lòng thử lại.");
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setDeleting(false);
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
    // Search term
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      const matchSearch = inv.order_id.toLowerCase().includes(lowerTerm) ||
        inv.tax_id.toLowerCase().includes(lowerTerm) ||
        inv.phone.toLowerCase().includes(lowerTerm);
      if (!matchSearch) return false;
    }

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

  const getRemainingTime = () => {
    if (!zaloTokenUpdatedAt) return 0;
    const updatedAt = new Date(zaloTokenUpdatedAt).getTime();
    const expiresAt = updatedAt + 25 * 60 * 60 * 1000;
    const now = Date.now();
    const remainingMs = expiresAt - now;
    if (remainingMs <= 0) return 0;
    return (remainingMs / (1000 * 60 * 60)).toFixed(1);
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-[#014B91] shadow-sm flex justify-between items-center px-6 py-2">
        <div className="max-w-[1400px] mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image src={logo} alt="Logo" className="object-contain h-10 w-auto" priority />
            <span className="text-sm font-medium text-white/80 uppercase tracking-widest pl-3 border-l-2 border-white/30">Admin</span>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold text-white">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'list' ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              Danh sách Yêu cầu
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              Cấu hình Trang chủ
            </button>
            <button
              onClick={() => { setActiveTab('zalo'); fetchZaloLogs(); }}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'zalo' ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              <span className="text-base">💬</span> Zalo ZNS
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("ledger_admin_auth");
                window.location.href = "/admin/login";
              }}
              className="text-white/70 hover:text-red-400 hover:bg-white/10 px-4 py-2 rounded-lg transition-all flex items-center gap-1"
              title="Đăng xuất"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-28 pb-20 px-4 md:px-8 max-w-[1400px] mx-auto min-h-screen">
        {activeTab === 'zalo' ? (
          <div>
            <div className="mb-8">
              <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-primary tracking-tight mb-2">
                💬 Zalo ZNS Notification
              </h1>
              <p className="text-on-surface-variant font-body text-sm md:text-base">
                Cấu hình gửi thông báo tự động đến khách hàng qua Zalo khi có yêu cầu mới hoặc cập nhật trạng thái.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Box 1: Zalo OA Credentials */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-primary font-headline font-bold text-xl mb-2 pb-4 border-b border-outline-variant/30">
                  <span className="text-xl">🔑</span> Thông tin Zalo OA
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">App ID</label>
                  <input
                    type="text"
                    value={zaloSettings.zalo_app_id}
                    onChange={e => setZaloSettings(p => ({ ...p, zalo_app_id: e.target.value }))}
                    placeholder="Ví dụ: 1234567890"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">App Secret</label>
                  <input
                    type="password"
                    value={zaloSettings.zalo_app_secret}
                    onChange={e => setZaloSettings(p => ({ ...p, zalo_app_secret: e.target.value }))}
                    placeholder="Điền App Secret mới để cập nhật"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                  />
                  <p className="text-xs text-slate-400 mt-2 italic">* Không hiển thị giá trị cũ vì lý do bảo mật. Chỉ điền nếu muốn thay đổi.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Refresh Token</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={zaloSettings.zalo_refresh_token}
                      onChange={e => setZaloSettings(p => ({ ...p, zalo_refresh_token: e.target.value }))}
                      placeholder={zaloSettings.zalo_refresh_token_masked || "Refresh Token hiện tại"}
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                    />
                    <button
                      onClick={handleManualRefresh}
                      disabled={manualRefreshing}
                      className="shrink-0 px-4 py-3 bg-[#8C52FF] text-white hover:bg-[#7236F4] rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                    >
                      {manualRefreshing ? "Đang xử lý..." : "Refresh"}
                    </button>
                  </div>
                  {zaloTokenUpdatedAt && Number(getRemainingTime()) > 0 ? (
                    <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      Access Token <span className="bg-emerald-50/50 text-emerald-700 font-mono px-1 rounded border border-emerald-100">{zaloSettings.zalo_access_token || ""}</span> đang hoạt động (Hết hạn sau {getRemainingTime()} giờ)
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 font-bold mt-2 flex items-center gap-1.5">
                      ⚠️ Chưa có Access Token hoặc đã hết hạn
                    </p>
                  )}
                </div>
              </div>


              {/* Box 2: Template Config */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-primary font-headline font-bold text-xl mb-2 pb-4 border-b border-outline-variant/30">
                  <span className="text-xl">📋</span> Template ZNS
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Template ID — Yêu cầu mới
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={zaloSettings.zalo_template_new}
                      onChange={e => setZaloSettings(p => ({ ...p, zalo_template_new: e.target.value }))}
                      placeholder="Ví dụ: 123456"
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                    />
                    <button
                      onClick={() => setTestFormOpen(testFormOpen === 'new' ? null : 'new')}
                      className="shrink-0 px-4 py-3 bg-[#8C52FF] text-white hover:bg-[#7236F4] rounded-xl text-sm font-bold transition-colors"
                    >
                      Test
                    </button>
                  </div>

                  {testFormOpen === 'new' && (
                    <div className="mt-3 flex items-center gap-2 p-3 bg-[#F8F5FF] border border-[#E3D9FF] rounded-xl relative mb-2">
                      <div className="text-[#8C52FF] ml-1 mr-1">
                        <span className="material-symbols-outlined align-middle">smartphone</span>
                      </div>
                      <input
                        type="text"
                        value={testPhone}
                        onChange={e => setTestPhone(e.target.value)}
                        placeholder="Số điện thoại test (vd: 0985633455)"
                        className="flex-1 bg-white border-2 border-[#B996FF] focus:border-[#8C52FF] focus:ring-0 rounded-lg p-2 text-sm outline-none text-slate-700 font-mono"
                      />
                      <button
                        onClick={() => handleTestZalo('new')}
                        disabled={testingZalo}
                        className="px-4 py-2.5 bg-[#B996FF] hover:bg-[#8C52FF] text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {testingZalo ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-sm">send</span>}
                        Gửi
                      </button>
                      <button onClick={() => setTestFormOpen(null)} className="ml-1 p-1 text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined text-xl">close</span>
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Template ID — Cập nhật trạng thái
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={zaloSettings.zalo_template_status}
                      onChange={e => setZaloSettings(p => ({ ...p, zalo_template_status: e.target.value }))}
                      placeholder="Ví dụ: 654321"
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                    />
                    <button
                      onClick={() => setTestFormOpen(testFormOpen === 'status' ? null : 'status')}
                      className="shrink-0 px-4 py-3 bg-[#8C52FF] text-white hover:bg-[#7236F4] rounded-xl text-sm font-bold transition-colors"
                    >
                      Test
                    </button>
                  </div>

                  {testFormOpen === 'status' && (
                    <div className="mt-3 flex items-center gap-2 p-3 bg-[#F8F5FF] border border-[#E3D9FF] rounded-xl relative mb-2">
                      <div className="text-[#8C52FF] ml-1 mr-1">
                        <span className="material-symbols-outlined align-middle">smartphone</span>
                      </div>
                      <input
                        type="text"
                        value={testPhone}
                        onChange={e => setTestPhone(e.target.value)}
                        placeholder="Số điện thoại test (vd: 0985633455)"
                        className="flex-1 bg-white border-2 border-[#B996FF] focus:border-[#8C52FF] focus:ring-0 rounded-lg p-2 text-sm outline-none text-slate-700 font-mono"
                      />
                      <button
                        onClick={() => handleTestZalo('status')}
                        disabled={testingZalo}
                        className="px-4 py-2.5 bg-[#B996FF] hover:bg-[#8C52FF] text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {testingZalo ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-sm">send</span>}
                        Gửi
                      </button>
                      <button onClick={() => setTestFormOpen(null)} className="ml-1 p-1 text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined text-xl">close</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Save Button + Status Message */}
                <div className="mt-auto pt-4 border-t border-slate-100">
                  {zaloSaveMsg && (
                    <div className={`mb-3 p-3 rounded-xl text-sm font-medium ${zaloSaveMsg.ok
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : 'bg-red-50 border border-red-200 text-red-700'
                      }`}>
                      {zaloSaveMsg.ok ? '✅' : '❌'} {zaloSaveMsg.msg}
                    </div>
                  )}
                  <button
                    onClick={handleSaveZalo}
                    disabled={savingZalo}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary shadow-sm rounded-xl text-white font-bold hover:bg-[#023b7a] transition-all disabled:opacity-50"
                  >
                    {savingZalo
                      ? <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> Đang lưu...</>
                      : <><span className="material-symbols-outlined text-sm">save</span> Lưu cấu hình Zalo (Token & Template)</>
                    }
                  </button>
                </div>
              </div>
            </div>

            {/* Zalo Logs Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant/20 flex justify-between items-center">
                <div className="flex items-center gap-2 font-headline font-bold text-lg text-primary">
                  <span className="text-lg">📊</span> Lịch sử gửi thông báo ZNS
                </div>
                <button
                  onClick={fetchZaloLogs}
                  disabled={loadingZaloLogs}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span> Làm mới
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-outline-variant/30 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold">Thời gian</th>
                      <th className="px-5 py-3 text-left font-bold">Mã đơn</th>
                      <th className="px-5 py-3 text-left font-bold">SĐT</th>
                      <th className="px-5 py-3 text-left font-bold">Template</th>
                      <th className="px-5 py-3 text-center font-bold">Kết quả</th>
                      <th className="px-5 py-3 text-left font-bold">Lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {loadingZaloLogs ? (
                      <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                        <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                      </td></tr>
                    ) : zaloLogs.length === 0 ? (
                      <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                        <div className="text-4xl mb-2">💬</div>
                        <p className="text-sm">Chưa có lịch sử gửi tin. Hệ thống sẽ ghi log tự động sau khi gửi ZNS.</p>
                      </td></tr>
                    ) : (
                      zaloLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3 whitespace-nowrap text-slate-500 text-xs">
                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="px-5 py-3 font-semibold text-primary whitespace-nowrap">{log.order_id}</td>
                          <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{log.phone}</td>
                          <td className="px-5 py-3">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono">{log.template_id}</span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            {log.success
                              ? <span className="bg-green-100 text-green-700 font-bold text-xs px-3 py-1 rounded-full">✅ Thành công</span>
                              : <span className="bg-red-100 text-red-700 font-bold text-xs px-3 py-1 rounded-full">❌ Thất bại</span>
                            }
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-400">
                            {log.error_code ? (
                              <span className="font-mono text-red-500">{log.error_code}: {log.error_msg}</span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          <div>
            <div className="mb-8 flex justify-between items-end">
              <div>
                <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-primary tracking-tight mb-2">
                  Cấu hình Trang chủ
                </h1>
                <p className="text-on-surface-variant font-body text-sm md:text-base">
                  Chỉnh sửa trực tiếp nội dung hiển thị ở các khối Hướng dẫn và Hỗ trợ trên Trang chủ.
                </p>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary shadow-sm rounded-lg text-white font-bold hover:bg-[#023b7a] transition-all disabled:opacity-50"
              >
                {savingSettings ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : <span className="material-symbols-outlined text-sm">save</span>}
                Lưu cấu hình
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Box 1: Guide */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-primary font-headline font-bold text-xl mb-2 pb-4 border-b border-outline-variant/30">
                  <span className="material-symbols-outlined">menu_book</span> Khối: Hướng dẫn Yêu cầu
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Tiêu đề khối</label>
                  <input type="text" value={siteSettings.guideTitle} onChange={(e) => setSiteSettings(p => ({ ...p, guideTitle: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Nội dung (hỗ trợ tự động xuống dòng)</label>
                  <textarea rows={5} value={siteSettings.guideContent} onChange={(e) => setSiteSettings(p => ({ ...p, guideContent: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"></textarea>
                </div>
              </div>

              {/* Box 2: Support */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-primary font-headline font-bold text-xl mb-2 pb-4 border-b border-outline-variant/30">
                  <span className="material-symbols-outlined">support_agent</span> Khối: Hỗ trợ nhanh
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Tiêu đề khối</label>
                  <input type="text" value={siteSettings.supportTitle} onChange={(e) => setSiteSettings(p => ({ ...p, supportTitle: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Nội dung (hỗ trợ tự động xuống dòng)</label>
                  <textarea rows={5} value={siteSettings.supportContent} onChange={(e) => setSiteSettings(p => ({ ...p, supportContent: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"></textarea>
                </div>
                <div className="border-t border-slate-200 pt-4 mt-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">🔗 Link tham gia Nhóm Zalo Hỗ trợ</label>
                  <input type="text" value={siteSettings.zaloGroupLink || ""} onChange={(e) => setSiteSettings(p => ({ ...p, zaloGroupLink: e.target.value }))} placeholder="https://zalo.me/g/..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">📷 Link URL ảnh Mã QR Zalo</label>
                  <input type="text" value={siteSettings.zaloGroupQrUrl || ""} onChange={(e) => setSiteSettings(p => ({ ...p, zaloGroupQrUrl: e.target.value }))} placeholder="https://...qr.png" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  <p className="text-xs text-slate-500 mt-2 italic">* Tải ảnh QR lên mạng (như Imgur.com) và copy dán Link ảnh vào đây để hiển thị mã QR.</p>
                </div>
              </div>

              {/* Box 3: Security */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-200/50 flex flex-col gap-4 md:col-span-2 mt-4">
                <div className="flex items-center gap-2 text-red-600 font-headline font-bold text-xl mb-2 pb-4 border-b border-red-100">
                  <span className="material-symbols-outlined">security</span> Bảo mật: Đổi Mật Khẩu Admin
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Mật khẩu hiện tại</label>
                    <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm(p => ({ ...p, current: e.target.value }))} placeholder="••••••" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Mật khẩu mới</label>
                    <input type="password" value={passwordForm.newPass} onChange={(e) => setPasswordForm(p => ({ ...p, newPass: e.target.value }))} placeholder="••••••" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={handleChangePassword} disabled={changingPass} className="w-full md:w-auto px-6 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 h-[46px] mt-[26px]">
                      {changingPass ? "Đang xử lý..." : "Đổi mật khẩu"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-primary tracking-tight mb-1">
                Danh sách Yêu cầu Xuất Hoá đơn
              </h1>
              <p className="text-on-surface-variant font-body text-sm md:text-base">
                Theo dõi và xử lý các yêu cầu được gửi từ khách hàng. Dữ liệu sẽ tự động làm mới.
              </p>
            </div>

            {/* Status Filter Tabs + Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {[
                { key: 'pending', label: 'Đang chờ duyệt', icon: 'pending_actions' },
                { key: 'processed', label: 'Đã xử lý', icon: 'check_circle' },
                { key: 'rejected', label: 'Bị từ chối', icon: 'cancel' },
                { key: 'all', label: 'Tất cả', icon: 'list' },
              ].map(tab => {
                const count = tab.key === 'all'
                  ? invoices.length
                  : invoices.filter(inv => inv.status === tab.key).length;
                const isActive = statusFilter === tab.key;
                const colorMap: Record<string, string> = {
                  pending: isActive ? 'bg-[#F97316] text-white border-[#F97316] shadow-md shadow-orange-100' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600',
                  processed: isActive ? 'bg-[#16a34a] text-white border-[#16a34a] shadow-md shadow-green-100' : 'bg-white text-slate-600 border-slate-200 hover:border-green-400 hover:text-green-700',
                  rejected: isActive ? 'bg-[#dc2626] text-white border-[#dc2626] shadow-md shadow-red-100' : 'bg-white text-slate-600 border-slate-200 hover:border-red-400 hover:text-red-600',
                  all: isActive ? 'bg-primary   text-white border-primary   shadow-md shadow-blue-100' : 'bg-white text-slate-600 border-slate-200 hover:border-primary/60 hover:text-primary',
                };
                const badgeMap: Record<string, string> = {
                  pending: isActive ? 'bg-white/25 text-white' : 'bg-orange-100 text-orange-700',
                  processed: isActive ? 'bg-white/25 text-white' : 'bg-green-100  text-green-700',
                  rejected: isActive ? 'bg-white/25 text-white' : 'bg-red-100    text-red-700',
                  all: isActive ? 'bg-white/25 text-white' : 'bg-slate-100  text-slate-600',
                };
                return (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border font-semibold text-sm transition-all duration-200 ${colorMap[tab.key]}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                    {tab.label}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeMap[tab.key]}`}>{count}</span>
                  </button>
                );
              })}
              {/* Action buttons aligned right */}
              <div className="ml-auto flex gap-2 shrink-0">
                <button
                  onClick={handleExportExcel}
                  disabled={filteredInvoices.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 shadow-sm rounded-lg text-white font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Xuất Excel danh sách này
                </button>
                <button
                  onClick={fetchInvoices}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/50 shadow-sm rounded-lg text-primary font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  Làm mới
                </button>
              </div>
            </div>

            {/* Search & Date Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 mb-6 flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-1.5 flex-1 min-w-[250px]">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tìm kiếm (Mã đơn, MST, SĐT)</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Nhập từ khóa..."
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
                />
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
                  onClick={() => { setSearchTerm(""); setStatusFilter("pending"); setDateFrom(""); setDateTo(""); }}
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
                      <th className="px-4 py-4 font-bold w-[100px]">Thời gian</th>
                      <th className="px-3 py-4 font-bold w-[120px]">Mã đơn hàng</th>
                      <th className="px-3 py-4 font-bold w-[100px]">Mã số thuế</th>
                      <th className="px-4 py-4 font-bold">Công ty / Tổ chức</th>
                      <th className="px-4 py-4 font-bold w-[150px]">Liên hệ</th>
                      <th className="px-3 py-4 font-bold text-center w-[120px]">Trạng thái</th>
                      <th className="px-3 py-4 font-bold text-center w-[50px]">Xóa</th>
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
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="font-medium text-slate-700">
                              {new Intl.DateTimeFormat("vi-VN", { timeStyle: "short" }).format(new Date(inv.createdAt))}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(inv.createdAt))}
                            </div>
                          </td>
                          <td className="px-3 py-4 font-semibold text-primary">
                            {inv.order_id.split(/[,;\s]+/).filter(Boolean).map((id, index) => (
                              <div key={index} className="flex items-center gap-1 mb-1 last:mb-0 group/copy">
                                <span className="whitespace-nowrap text-[13px]">{id}</span>
                                <button
                                  onClick={() => handleCopy(id, `order-${inv.id}-${index}`)}
                                  title={copiedId === `order-${inv.id}-${index}` ? 'Đã copy!' : 'Copy mã đơn'}
                                  className={`opacity-0 group-hover/copy:opacity-100 p-0.5 rounded transition-all duration-200 ${copiedId === `order-${inv.id}-${index}`
                                      ? 'text-green-500 opacity-100'
                                      : 'text-slate-400 hover:text-primary'
                                    }`}
                                >
                                  <span className="material-symbols-outlined text-[14px] leading-none">
                                    {copiedId === `order-${inv.id}-${index}` ? 'check' : 'content_copy'}
                                  </span>
                                </button>
                              </div>
                            ))}
                          </td>
                          <td className="px-3 py-4 font-medium">
                            <div className="flex items-center gap-1 group/taxcopy">
                              <span className="bg-slate-100 px-1.5 py-1 rounded text-slate-600 border border-slate-200 whitespace-nowrap font-mono text-[11px] tracking-widest">
                                {inv.tax_id}
                              </span>
                              <button
                                onClick={() => handleCopy(inv.tax_id, `tax-${inv.id}`)}
                                title={copiedId === `tax-${inv.id}` ? 'Đã copy!' : 'Copy mã số thuế'}
                                className={`opacity-0 group-hover/taxcopy:opacity-100 p-0.5 rounded transition-all duration-200 shrink-0 ${copiedId === `tax-${inv.id}`
                                    ? 'text-green-500 opacity-100'
                                    : 'text-slate-400 hover:text-slate-700'
                                  }`}
                              >
                                <span className="material-symbols-outlined text-[14px] leading-none">
                                  {copiedId === `tax-${inv.id}` ? 'check' : 'content_copy'}
                                </span>
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-4 min-w-[250px]">
                            <div className="font-bold text-on-surface whitespace-normal break-words leading-tight">{inv.company_name}</div>
                            <div className="text-xs text-slate-500 whitespace-normal break-words mt-1.5">{inv.address}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1">
                              <a href={`mailto:${inv.email}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">mail</span> {inv.email}
                              </a>
                              <a href={`tel:${inv.phone}`} className="text-xs text-slate-600 hover:underline flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">phone</span> {inv.phone}
                              </a>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-center">
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
                          <td className="px-2 py-4 text-center">
                            <button
                              onClick={() => handleDeleteInvoice(inv.id, inv.order_id)}
                              title="Xóa yêu cầu này"
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !deleting && setDeleteModal({ open: false, id: "", orderId: "" })}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal Card */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-500 text-4xl">delete_forever</span>
            </div>

            {/* Text */}
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-slate-800 mb-2">Xác nhận Xóa</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Bạn có chắc muốn xóa yêu cầu hoá đơn?
              </p>
              <p className="mt-2 font-bold text-primary bg-blue-50 px-4 py-2 rounded-lg text-sm">
                Mã đơn: {deleteModal.orderId}
              </p>
              <p className="text-xs text-red-500 mt-3 font-medium">⚠️ Hành động này không thể hoàn tác.</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setDeleteModal({ open: false, id: "", orderId: "" })}
                disabled={deleting}
                className="flex-1 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm shadow-red-200"
              >
                {deleting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Xóa yêu cầu
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
