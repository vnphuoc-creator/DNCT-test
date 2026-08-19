"use client";

import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getCurrentPeriod, formatPeriodLabel } from "../../lib/period";
import {
  Search,
  Award,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  ArrowLeft,
  Printer,
  Sparkles,
  BookOpen,
} from "lucide-react";

export default function MyResultPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [error, setError] = useState("");

  async function handleSearch(e) {
    e?.preventDefault();
    const term = searchTerm.trim();
    if (!term) {
      setError("Vui lòng nhập họ tên hoặc email của bạn để tra cứu.");
      return;
    }
    setError("");
    setLoading(true);
    setSearched(true);
    setSelectedResult(null);

    const { data, error: dbError } = await supabase
      .from("quiz_results")
      .select("*")
      .or(`email.ilike.%${term}%,user_name.ilike.%${term}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    setLoading(false);

    if (dbError) {
      setError("Lỗi kết nối cơ sở dữ liệu: " + dbError.message);
      return;
    }

    setResults(data || []);
    if (data && data.length > 0) {
      setSelectedResult(data[0]);
    }
  }

  function formatDuration(seconds) {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} phút ${s.toString().padStart(2, "0")} giây`;
  }

  return (
    <div className="shell" style={{ width: "100%", maxWidth: 840, margin: "0 auto" }}>
      {/* Header */}
      <div className="card" style={{ width: "100%", maxWidth: 840, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--brand-cyan)", fontSize: 13, textDecoration: "none" }}>
            <ArrowLeft size={16} /> Trang chủ
          </a>
          <span className="badge badge-pass" style={{ fontSize: 11 }}>
            Kỳ hiện tại: {formatPeriodLabel(getCurrentPeriod())}
          </span>
        </div>

        <div className="eyebrow" style={{ color: "var(--amber)", letterSpacing: "0.08em" }}>
          <Award size={14} /> TRA CỨU KẾT QUẢ & CHỨNG NHẬN CÁ NHÂN
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 8px 0" }}>
          Hồ sơ Năng lực Kỹ thuật Cá nhân
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--text-dim)", margin: "0 0 18px 0" }}>
          Nhập Họ và tên hoặc Email của bạn để kiểm tra điểm số, lịch sử thi và tải chứng nhận hoàn thành.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
            <input
              className="field"
              style={{ paddingLeft: 38, margin: 0 }}
              type="text"
              placeholder="Nhập họ tên hoặc email (ví dụ: Nguyen Van A)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-dim)" }} />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: "0 20px", height: 42, whiteSpace: "nowrap" }} disabled={loading}>
            {loading ? "Đang tìm..." : "Tra cứu"}
          </button>
        </form>

        {error && <div className="error-box" style={{ marginTop: 14 }}>{error}</div>}
      </div>

      {/* Results view */}
      {searched && results.length === 0 && !loading && (
        <div className="card" style={{ width: "100%", maxWidth: 840, textAlign: "center", padding: "36px 20px" }}>
          <AlertTriangle size={36} style={{ color: "var(--amber)", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: 16, margin: "0 0 6px 0" }}>Không tìm thấy bài thi nào phù hợp</h3>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>
            Hãy kiểm tra lại chính xác Họ tên hoặc Email mà bạn đã dùng khi làm bài kiểm tra.
          </p>
        </div>
      )}

      {results.length > 0 && selectedResult && (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Certificate Card */}
          <div
            className="dashboard-section-box"
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              border: "2px solid rgba(56, 189, 248, 0.4)",
              borderRadius: 14,
              padding: "28px 24px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ background: "rgba(255,255,255,0.95)", padding: "4px 8px", borderRadius: 6 }}>
                  <img src="/logo.png" alt="AHT" style={{ height: 26, width: "auto" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--brand-cyan)", fontWeight: 700, letterSpacing: "0.08em" }}>
                    CÔNG TY CỔ PHẦN ĐẦU TƯ KHAI THÁC NHÀ GA QUỐC TẾ ĐÀ NẴNG (AHT)
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                    ĐỘI ĐIỆN NƯỚC CÔNG TRÌNH (ĐNCT) — PHÒNG KỸ THUẬT
                  </div>
                </div>
              </div>

              <button
                className="btn-secondary no-print"
                style={{ fontSize: 12, padding: "6px 12px" }}
                onClick={() => window.print()}
              >
                <Printer size={14} /> In phiếu kết quả
              </button>
            </div>

            <div style={{ textAlign: "center", margin: "24px 0 20px" }}>
              <div style={{ fontSize: 13, color: "var(--amber)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                KẾT QUẢ ĐÁNH GIÁ NĂNG LỰC KỸ THUẬT ĐỊNH KỲ
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: "6px 0", color: "#ffffff" }}>
                {selectedResult.user_name}
              </h2>
              <div style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                Email: {selectedResult.email || "—"} | Kỳ sát hạch: {formatPeriodLabel(selectedResult.period || getCurrentPeriod())}
              </div>
            </div>

            {/* Score Showcase */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                margin: "20px 0",
              }}
            >
              <div className="stat-box" style={{ padding: "14px 10px" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--brand-cyan)", fontFamily: "var(--font-mono)" }}>
                  {selectedResult.score} / {selectedResult.total}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", marginTop: 4 }}>
                  Điểm số đạt được
                </div>
              </div>

              <div className="stat-box" style={{ padding: "14px 10px" }}>
                {(() => {
                  const pct = selectedResult.total > 0 ? Math.round((selectedResult.score / selectedResult.total) * 100) : 0;
                  const isPass = pct >= 80;
                  return (
                    <>
                      <div style={{ fontSize: 24, fontWeight: 800, color: isPass ? "var(--ok)" : "var(--danger)", fontFamily: "var(--font-mono)" }}>
                        {pct}%
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", marginTop: 4 }}>
                        Tỷ lệ chính xác
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="stat-box" style={{ padding: "14px 10px" }}>
                {(() => {
                  const pct = selectedResult.total > 0 ? Math.round((selectedResult.score / selectedResult.total) * 100) : 0;
                  const label = pct >= 90 ? "Xuất sắc" : pct >= 80 ? "Đạt chuẩn" : "Cần ôn lại";
                  const color = pct >= 90 ? "var(--amber)" : pct >= 80 ? "var(--ok)" : "var(--danger)";
                  return (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 800, color, marginTop: 4 }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", marginTop: 6 }}>
                        Xếp loại năng lực
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="stat-box" style={{ padding: "14px 10px" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#38bdf8", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                  {formatDuration(selectedResult.duration_seconds)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", marginTop: 6 }}>
                  Thời gian làm bài
                </div>
              </div>
            </div>

            {/* Answer breakdown */}
            {selectedResult.answers && selectedResult.answers.length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--panel-border)" }}>
                <h3 style={{ fontSize: 14, margin: "0 0 12px 0", fontWeight: 700, color: "var(--text)" }}>
                  Chi tiết từng câu hỏi trong bài làm:
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {selectedResult.answers.map((a, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: a.is_correct ? "rgba(16, 185, 129, 0.06)" : "rgba(244, 63, 94, 0.06)",
                        border: `1px solid ${a.is_correct ? "rgba(16, 185, 129, 0.25)" : "rgba(244, 63, 94, 0.25)"}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>
                          Câu {i + 1}: {a.question_text}
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 12,
                            color: a.is_correct ? "var(--ok)" : "var(--danger)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {a.is_correct ? "✓ ĐÚNG" : "✗ SAI"}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>
                        Đã chọn:{" "}
                        <strong style={{ color: "var(--text)" }}>
                          {a.options?.[a.selected_index] || "Chưa chọn"}
                        </strong>
                        {!a.is_correct && (
                          <span style={{ color: "var(--ok)", marginLeft: 10 }}>
                            (Đáp án chuẩn: {a.options?.[a.correct_index]})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* History selector if user has multiple tests */}
          {results.length > 1 && (
            <div className="card" style={{ width: "100%", maxWidth: 840 }}>
              <h3 style={{ fontSize: 14, margin: "0 0 10px 0", fontWeight: 700 }}>
                Các lần làm bài khác của bạn ({results.length} lượt):
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {results.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedResult(r)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: selectedResult.id === r.id ? "rgba(2, 132, 199, 0.18)" : "rgba(255, 255, 255, 0.03)",
                      border: `1px solid ${selectedResult.id === r.id ? "var(--brand-cyan)" : "var(--panel-border)"}`,
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 13 }}>Kỳ {formatPeriodLabel(r.period || "khong-ro")}</strong>
                      <span style={{ fontSize: 12, color: "var(--text-dim)", marginLeft: 10 }}>
                        {new Date(r.created_at).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: (r.score / r.total) >= 0.8 ? "var(--ok)" : "var(--danger)" }}>
                      {r.score}/{r.total} ({Math.round((r.score / r.total) * 100)}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
