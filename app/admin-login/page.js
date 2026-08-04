"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/report";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "Sai mật khẩu, thử lại nhé.");
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError("Có lỗi xảy ra, thử lại sau.");
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="eyebrow">Khu vực quản trị</div>
      <h1>Nhập mật khẩu để tiếp tục</h1>
      <p>Trang lịch sử và báo cáo chỉ dành cho người quản lý bài test.</p>

      <form onSubmit={handleSubmit}>
        {error && <div className="error-box">{error}</div>}
        <label htmlFor="password">Mật khẩu</label>
        <input
          id="password"
          className="field"
          type="password"
          placeholder="Nhập mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Đang kiểm tra..." : "Đăng nhập"}
        </button>
      </form>

      <div className="link-row">
        <a href="/">← Về trang làm bài</a>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="card"><p>Đang tải...</p></div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
