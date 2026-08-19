"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getCurrentPeriod, formatPeriodLabel } from "../../lib/period";
import {
  RotateCcw,
  Search,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  X,
  History,
} from "lucide-react";

export default function ResultsPage() {
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [errorMsg, setErrorMsg] = useState("");
  const [results, setResults] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [resetTarget, setResetTarget] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    loadResults();
  }, []);

  async function loadResults() {
    setStatus("loading");
    const { data, error } = await supabase
      .from("quiz_results")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }
    setResults(data || []);
    setStatus("ready");
  }

  const periods = useMemo(() => {
    const s = new Set(results.map((r) => r.period || "khong-ro"));
    return Array.from(s).sort().reverse();
  }, [results]);

  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    return results.filter((r) => {
      const matchPeriod = selectedPeriod === "all" || (r.period || "khong-ro") === selectedPeriod;
      const matchQuery =
        !q ||
        (r.user_name && r.user_name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q));
      return matchPeriod && matchQuery;
    });
  }, [results, search, selectedPeriod]);

  async function handleExecuteReset() {
    if (!resetTarget) return;
    setResetting(true);

    const { error: delError } = await supabase
      .from("quiz_results")
      .delete()
      .eq("id", resetTarget.id);

    setResetting(false);

    if (delError) {
      alert("Lỗi khi xóa kết quả: " + delError.message);
      return;
    }

    const name = resetTarget.user_name;
    setResetTarget(null);
    setToastMsg(`✓ Đã xóa kết quả của "${name}". Nhân sự này có thể vào thi lại ngay.`);
    await loadResults();

    setTimeout(() => {
      setToastMsg("");
    }, 6000);
  }

  async function handleLogout() {
    await fetch("/api/admin-logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className="card" style={{ width: "100%", maxWidth: 960, margin: "0 auto" }}>
      <div className="eyebrow" style={{ color: "var(--brand-cyan)", fontWeight: 700 }}>
        <History size={14} /> QUẢN LÝ LỊCH SỬ BÀI THI & CẤP QUYỀN THI LẠI
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 6px 0" }}>
        Lịch sử Bài làm & Quản lý Kết quả
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 16px 0" }}>
        Xem toàn bộ lượt làm bài trong hệ thống. Quản lý có thể bấm <strong>&ldquo;Cho thi lại&rdquo;</strong> để xóa bài cũ của nhân sự và cho phép họ làm lại bài kiểm tra mới.
      </p>

      {toastMsg && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: 8,
            padding: "10px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#34d399",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <input
            className="field"
            style={{ paddingLeft: 36, margin: 0 }}
            type="text"
            placeholder="Tìm theo họ tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={16} style={{ position: "absolute", left: 12, top: 13, color: "var(--text-dim)" }} />
        </div>

        <select
          className="field"
          style={{ width: "auto", margin: 0, minWidth: 160 }}
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
        >
          <option value="all">Tất cả các kỳ</option>
          {periods.map((p) => (
            <option key={p} value={p}>
              {formatPeriodLabel(p)}
            </option>
          ))}
        </select>
      </div>

      {status === "loading" && <p style={{ color: "var(--text-dim)" }}>Đang tải dữ liệu...</p>}
      {status === "error" && <div className="error-box">{errorMsg}</div>}

      {status === "ready" && filteredResults.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-dim)" }}>
          Không tìm thấy bài làm nào phù hợp với bộ lọc.
        </div>
      )}

      {status === "ready" && filteredResults.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Họ và tên</th>
                <th>Email</th>
                <th>Kỳ thi</th>
                <th style={{ textAlign: "center" }}>Điểm số</th>
                <th style={{ textAlign: "center" }}>Tỷ lệ</th>
                <th style={{ textAlign: "center" }}>Thời gian thi</th>
                <th style={{ textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r) => {
                const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                const isPass = pct >= 80;
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: "var(--text)" }}>{r.user_name}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>
                      {r.email || "—"}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <span className="badge badge-pass" style={{ fontSize: 11 }}>
                        {formatPeriodLabel(r.period || "khong-ro")}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                      {r.score} / {r.total}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          color: isPass ? "var(--ok)" : "var(--danger)",
                        }}
                      >
                        {pct}%
                      </span>
                    </td>
                    <td style={{ textAlign: "center", fontSize: 12, color: "var(--text-dim)" }}>
                      {new Date(r.created_at).toLocaleString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{
                          fontSize: 11,
                          padding: "3px 8px",
                          color: "var(--danger)",
                          borderColor: "rgba(244, 63, 94, 0.4)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                        title={`Xóa bài thi của ${r.user_name} để cho phép thi lại`}
                        onClick={() => setResetTarget(r)}
                      >
                        <RotateCcw size={12} /> Cho thi lại
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation modal */}
      {resetTarget && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 480,
              border: "1px solid rgba(244, 63, 94, 0.4)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)", fontWeight: 700, fontSize: 16 }}>
                <AlertTriangle size={20} />
                Xác nhận Xóa kết quả & Cho thi lại
              </div>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: 4, height: 28, width: 28, display: "flex", alignItems: "center", justifyContent: "center" }}
                onClick={() => setResetTarget(null)}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, margin: "0 0 14px 0" }}>
              Bạn có chắc chắn muốn xóa bài thi của nhân sự:
            </p>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--panel-border)",
                borderRadius: 8,
                padding: "12px 14px",
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>{resetTarget.user_name}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                Email: {resetTarget.email || "—"}
              </div>
              <div style={{ fontSize: 12, color: "var(--brand-cyan)", marginTop: 6 }}>
                Kỳ thi: <strong>{formatPeriodLabel(resetTarget.period || "khong-ro")}</strong> — Điểm: <strong>{resetTarget.score}/{resetTarget.total}</strong>
              </div>
            </div>

            <div
              style={{
                background: "rgba(244, 63, 94, 0.08)",
                border: "1px solid rgba(244, 63, 94, 0.25)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 12.5,
                color: "#fda4af",
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              ⚠️ <strong>Lưu ý:</strong> Sau khi xóa, kết quả bài thi này sẽ bị hủy. Nhân sự <strong>{resetTarget.user_name}</strong> sẽ được phép vào thi lại bài mới ngay lập tức.
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "0 16px", height: 38, fontSize: 13 }}
                onClick={() => setResetTarget(null)}
                disabled={resetting}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{
                  padding: "0 18px",
                  height: 38,
                  fontSize: 13,
                  background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                  borderColor: "#f43f5e",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onClick={handleExecuteReset}
                disabled={resetting}
              >
                <Trash2 size={15} />
                {resetting ? "Đang xóa..." : "Xác nhận Xóa & Cho thi lại"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="link-row" style={{ marginTop: 24, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/">
            <button className="btn-secondary">← Trang chủ</button>
          </a>
          <a href="/dashboard">
            <button className="btn-secondary">Dashboard Quản lý</button>
          </a>
          <a href="/report">
            <button className="btn-primary">Xuất Báo cáo Excel</button>
          </a>
        </div>
        <button className="btn-secondary" onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
