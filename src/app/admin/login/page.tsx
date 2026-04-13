"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API delay
    await new Promise(r => setTimeout(r, 600));

    if (password === "lmc@123") {
      localStorage.setItem("ledger_admin_auth", "true");
      window.location.href = "/admin"; // Native redirect
    } else {
      setError(true);
      setLoading(false);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-4 relative overflow-hidden">
      {/* Decorative Blob */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 mb-4 shadow-sm border border-blue-100">
            <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
          </div>
          <h1 className="text-2xl font-black text-[#034D9E] tracking-tight font-headline">
            LMC <span className="text-slate-500 uppercase font-medium tracking-widest pl-1 border-l-2 border-slate-300 ml-1">Admin</span>
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-body">Vui lòng đăng nhập để truy cập Bảng quản trị.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Mật khẩu truy cập
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                lock
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className={`w-full pl-11 pr-4 py-3 bg-white border ${error ? 'border-red-400 focus:ring-red-500' : 'border-outline-variant/60 focus:ring-primary focus:border-primary'} rounded-xl text-sm outline-none transition-all focus:ring-2`}
                required
              />
            </div>
            {error && <p className="text-red-500 text-xs mt-2 font-medium">Mật khẩu không chính xác!</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-[#023b7a] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(3,77,158,0.39)] hover:shadow-[0_6px_20px_rgba(3,77,158,0.23)]"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">login</span>
                Đăng nhập
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Mật khẩu mặc định: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">admin</span>
        </div>
      </div>
    </div>
  );
}
