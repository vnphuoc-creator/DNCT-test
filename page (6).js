"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function ResultsPage() {
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [errorMsg, setErrorMsg] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    loadResults();
  }, []);

  async function loadResults() {
    const { data, error } = await supabase
      .from("quiz_results")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }
    setResults(data || []);
    setStatus("ready");
  }

  async function handleLogout() {
    await fetch("/api/admin-logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className="card">
      <div className="eyebrow">Lịch sử</div>
      <h2>Kết quả gần đây</h2>

      {status === "loading" && <p>Đang tải...</p>}
      {status === "error" && <div className="error-box">{errorMsg}</div>}

      {status === "ready" && results.length === 0 && (
        <p>Chưa có ai làm bài cả. Hãy là người đầu tiên!</p>
      )}

      {status === "ready" && results.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Email</th>
              <th>Điểm</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id}>
                <td>{r.user_name}</td>
                <td>{r.email || "—"}</td>
                <td>
                  {r.score}/{r.total}
                </td>
                <td>
                  {new Date(r.created_at).toLocaleString("vi-VN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="link-row">
        <a href="/">
          <button className="btn-secondary">← Trang chủ</button>
        </a>
        <a href="/report">
          <button className="btn-primary">Xem báo cáo tổng hợp</button>
        </a>
        <button className="btn-secondary" onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
