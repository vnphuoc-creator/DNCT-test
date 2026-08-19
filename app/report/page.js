"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getCurrentPeriod, formatPeriodLabel } from "../../lib/period";

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}p ${s.toString().padStart(2, "0")}s`;
}

export default function ReportPage() {
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [allResults, setAllResults] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadResults();
  }, []);

  async function loadResults() {
    const { data, error } = await supabase
      .from("quiz_results")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }
    setAllResults(data || []);
    setStatus("ready");
  }

  const availablePeriods = useMemo(() => {
    const set = new Set(allResults.map((r) => r.period || "khong-ro"));
    return Array.from(set).sort().reverse();
  }, [allResults]);

  const results = useMemo(() => {
    if (selectedPeriod === "all") return allResults;
    return allResults.filter((r) => (r.period || "khong-ro") === selectedPeriod);
  }, [allResults, selectedPeriod]);

  const stats = useMemo(() => {
    if (results.length === 0) return null;

    const percents = results.map((r) => (r.total > 0 ? (r.score / r.total) * 100 : 0));
    const avg = percents.reduce((a, b) => a + b, 0) / percents.length;
    const max = Math.max(...percents);
    const min = Math.min(...percents);

    const questionStats = {};
    for (const r of results) {
      const answers = r.answers || [];
      for (const a of answers) {
        const key = a.question_text || `#${a.question_id}`;
        if (!questionStats[key]) {
          questionStats[key] = {
            wrong: 0,
            total: 0,
            category: a.category || "Hệ thống chung",
          };
        }
        questionStats[key].total += 1;
        if (!a.is_correct) questionStats[key].wrong += 1;
      }
    }

    const hardestQuestions = Object.entries(questionStats)
      .map(([question, s]) => ({
        question,
        category: s.category,
        wrong: s.wrong,
        total: s.total,
        wrongRate: s.total > 0 ? Math.round((s.wrong / s.total) * 100) : 0,
      }))
      .filter((q) => q.wrong > 0)
      .sort((a, b) => b.wrongRate - a.wrongRate || b.wrong - a.wrong)
      .slice(0, 15);

    const passCount = percents.filter((p) => p >= 80).length;
    const passRate = Math.round((passCount / results.length) * 100);

    return {
      count: results.length,
      avg: avg.toFixed(1),
      max: max.toFixed(0),
      min: min.toFixed(0),
      passCount,
      passRate,
      hardestQuestions,
    };
  }, [results]);

  async function handleLogout() {
    await fetch("/api/admin-logout", { method: "POST" });
    window.location.href = "/";
  }

  async function handleExportExcel() {
    const XLSX = await import("xlsx");

    // Sheet 1: Tổng hợp danh sách điểm và xếp loại
    const summarySheetData = [
      [
        "Họ và tên",
        "Email",
        "Số câu đúng",
        "Tổng số câu",
        "Tỉ lệ (%)",
        "Xếp loại",
        "Thời gian làm bài",
        "Thời điểm nộp bài",
      ],
      ...results.map((r) => {
        const percent = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
        const tier = percent >= 90 ? "Xuất sắc" : percent >= 80 ? "Đạt chuẩn" : "Cần đào tạo lại";
        return [
          r.user_name,
          r.email || "",
          r.score,
          r.total,
          percent,
          tier,
          formatDuration(r.duration_seconds),
          new Date(r.created_at).toLocaleString("vi-VN"),
        ];
      }),
    ];

    // Sheet 2: Câu hỏi hay sai
    const hardestSheetData = [
      ["Hệ thống", "Câu hỏi", "Số lần sai", "Số lần xuất hiện", "Tỷ lệ sai (%)"],
      ...stats.hardestQuestions.map((q) => [q.category, q.question, q.wrong, q.total, q.wrongRate]),
    ];

    // Sheet 3: Chi tiết từng người + từng câu trả lời
    const detailSheetData = [
      [
        "Họ và tên",
        "Email",
        "Điểm đạt",
        "Tổng câu",
        "Tỷ lệ (%)",
        "Thời gian làm",
        "Thời điểm nộp",
        "Câu hỏi",
        "Lựa chọn của người thi",
        "Đáp án chính xác",
        "Kết quả",
      ],
    ];

    for (const r of results) {
      const answers = r.answers || [];
      const percent = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
      const duration = formatDuration(r.duration_seconds);
      const time = new Date(r.created_at).toLocaleString("vi-VN");

      if (answers.length === 0) {
        detailSheetData.push([r.user_name, r.email || "", r.score, r.total, percent, duration, time, "", "", "", ""]);
      } else {
        for (const a of answers) {
          detailSheetData.push([
            r.user_name,
            r.email || "",
            r.score,
            r.total,
            percent,
            duration,
            time,
            a.question_text || "",
            a.options?.[a.selected_index] ?? "",
            a.options?.[a.correct_index] ?? "",
            a.is_correct ? "Đúng" : "Sai",
          ]);
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summarySheetData), "Tong hop");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hardestSheetData), "Lỗ hổng kiến thức");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detailSheetData), "Chi tiet tung cau");

    const periodLabel = selectedPeriod === "all" ? "tat-ca" : selectedPeriod;
    XLSX.writeFile(wb, `Bao-cao-danh-gia-DNCT-${periodLabel}.xlsx`);
  }

  if (status === "loading") {
    return (
      <div className="card" style={{ textAlign: "center", padding: "40px" }}>
        <p style={{ color: "var(--amber)", fontSize: 16 }}>Đang tổng hợp báo cáo chi tiết...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="card">
        <div className="error-box">{errorMsg}</div>
        <a href="/">← Quay lại trang chủ</a>
      </div>
    );
  }

  return (
    <div className="card dashboard-print-area" style={{ maxWidth: 1100, width: "100%" }}>
      {/* Official Enterprise Print Header (Hiển thị Logo AHT & Tiêu đề cơ quan chính quy) */}
      <div className="print-official-header" style={{ display: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src="/logo.png" alt="AHT Logo" style={{ height: 48, width: "auto", objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#0284c7" }}>
              CÔNG TY CỔ PHẦN ĐẦU TƯ KHAI THÁC NHÀ GA QUỐC TẾ ĐÀ NẴNG (AHT)
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>
              PHÒNG KỸ THUẬT — ĐỘI ĐIỆN NƯỚC CÔNG TRÌNH (ĐNCT)
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
            KỲ: {selectedPeriod === "all" ? "TẤT CẢ CÁC KỲ" : formatPeriodLabel(selectedPeriod).toUpperCase()}
          </div>
          <div style={{ fontSize: 10, color: "#64748b" }}>
            Ngày lập: {new Date().toLocaleDateString("vi-VN")}
          </div>
        </div>
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "1px solid var(--panel-border)",
          paddingBottom: 16,
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="no-print" style={{ background: "rgba(255,255,255,0.95)", padding: "4px 8px", borderRadius: 6, display: "flex", alignItems: "center" }}>
            <img src="/logo.png" alt="AHT" style={{ height: 28, width: "auto" }} />
          </div>
          <div>
            <div className="eyebrow" style={{ color: "var(--brand-cyan)", letterSpacing: "0.08em" }}>
              BÁO CÁO DỮ LIỆU CHI TIẾT
            </div>
            <h1 style={{ margin: "2px 0 0 0", fontSize: 22, fontWeight: 800 }}>
              Hồ sơ Đánh giá Kiểm tra Đội ĐNCT
            </h1>
            <p style={{ margin: "2px 0 0 0", fontSize: 13.5, color: "var(--text-dim)" }}>
              Báo cáo lưu trữ kết quả và chi tiết câu trả lời của từng nhân sự
            </p>
          </div>
        </div>

        <div className="no-print" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            id="period-select"
            className="field"
            style={{ maxWidth: 220, margin: 0, padding: "8px 12px", fontSize: 13 }}
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value={getCurrentPeriod()}>{formatPeriodLabel(getCurrentPeriod())} (Kỳ hiện tại)</option>
            {availablePeriods
              .filter((p) => p !== getCurrentPeriod())
              .map((p) => (
                <option key={p} value={p}>
                  {p === "khong-ro" ? "Dữ liệu cũ" : formatPeriodLabel(p)}
                </option>
              ))}
            <option value="all">Tất cả các kỳ</option>
          </select>

          {stats && (
            <button
              className="btn-primary"
              style={{ padding: "8px 16px", fontSize: 13, whiteSpace: "nowrap" }}
              onClick={handleExportExcel}
            >
              Xuất Excel
            </button>
          )}

          <button
            className="btn-secondary"
            style={{ padding: "8px 14px", fontSize: 13, whiteSpace: "nowrap" }}
            onClick={() => window.print()}
          >
            In báo cáo
          </button>
        </div>
      </div>

      {!stats ? (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ fontSize: 16, color: "var(--text-dim)" }}>
            Chưa có lượt làm bài nào trong kỳ này.
          </p>
        </div>
      ) : (
        <div className="dashboard-fade">
          {/* Top KPI row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div
              className="stat-box"
              style={{
                background: "#0d1620",
                border: "1px solid var(--panel-border)",
                borderRadius: 10,
                padding: "14px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 22, fontFamily: "var(--font-mono)", color: "var(--amber)", fontWeight: 700 }}>
                {stats.count}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase" }}>
                Lượt làm bài
              </div>
            </div>

            <div
              className="stat-box"
              style={{
                background: "#0d1620",
                border: "1px solid var(--panel-border)",
                borderRadius: 10,
                padding: "14px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 22, fontFamily: "var(--font-mono)", color: "var(--ok)", fontWeight: 700 }}>
                {stats.passRate}%
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase" }}>
                Tỷ lệ Đạt (≥80%)
              </div>
            </div>

            <div
              className="stat-box"
              style={{
                background: "#0d1620",
                border: "1px solid var(--panel-border)",
                borderRadius: 10,
                padding: "14px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 22, fontFamily: "var(--font-mono)", color: "#38bdf8", fontWeight: 700 }}>
                {stats.avg}%
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase" }}>
                Điểm trung bình
              </div>
            </div>

            <div
              className="stat-box"
              style={{
                background: "#0d1620",
                border: "1px solid var(--panel-border)",
                borderRadius: 10,
                padding: "14px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 22, fontFamily: "var(--font-mono)", color: "var(--text)", fontWeight: 700 }}>
                {stats.max}% / {stats.min}%
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase" }}>
                Cao nhất / Thấp nhất
              </div>
            </div>
          </div>

          {/* Bảng chi tiết từng nhân sự */}
          <div
            style={{
              background: "#0d1620",
              border: "1px solid var(--panel-border)",
              borderRadius: 10,
              padding: "18px 16px",
              marginBottom: 24,
            }}
          >
            <h2 style={{ fontSize: 16, margin: "0 0 12px 0", fontWeight: 600 }}>
              Danh sách Nhân sự Đã Hoàn thành Bài Test
            </h2>

            <table>
              <thead>
                <tr>
                  <th>Họ và tên</th>
                  <th>Email</th>
                  <th style={{ textAlign: "center" }}>Điểm số</th>
                  <th style={{ textAlign: "center" }}>Tỉ lệ %</th>
                  <th style={{ textAlign: "center" }}>Thời gian làm</th>
                  <th style={{ textAlign: "center" }}>Thời điểm nộp</th>
                  <th style={{ textAlign: "right" }} className="no-print">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const percent = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                  const isPass = percent >= 80;
                  return (
                    <React.Fragment key={r.id}>
                      <tr>
                        <td style={{ fontWeight: 600, color: "var(--text)" }}>{r.user_name}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>
                          {r.email || "—"}
                        </td>
                        <td style={{ textAlign: "center", fontFamily: "var(--font-mono)" }}>
                          {r.score}/{r.total}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            className="badge"
                            style={{
                              background: isPass ? "rgba(69, 196, 176, 0.18)" : "rgba(229, 72, 77, 0.18)",
                              color: isPass ? "var(--ok)" : "var(--danger)",
                              border: isPass ? "1px solid rgba(69, 196, 176, 0.4)" : "1px solid rgba(229, 72, 77, 0.4)",
                            }}
                          >
                            {percent}%
                          </span>
                        </td>
                        <td style={{ textAlign: "center", fontSize: 13, color: "var(--text-dim)" }}>
                          {formatDuration(r.duration_seconds)}
                        </td>
                        <td style={{ textAlign: "center", fontSize: 13, color: "var(--text-dim)" }}>
                          {new Date(r.created_at).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td style={{ textAlign: "right" }} className="no-print">
                          <button
                            className="btn-secondary"
                            style={{ padding: "4px 8px", fontSize: 12 }}
                            onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                          >
                            {expandedId === r.id ? "Đóng" : "Xem bài làm"}
                          </button>
                        </td>
                      </tr>
                      {expandedId === r.id && (
                        <tr>
                          <td colSpan={7} style={{ background: "#131b24", padding: "14px 16px" }}>
                            {(r.answers || []).length === 0 ? (
                              <p style={{ margin: "4px 0", color: "var(--text-dim)", fontSize: 13 }}>
                                Lượt làm bài này không có chi tiết từng câu.
                              </p>
                            ) : (
                              <div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "var(--amber)",
                                    fontWeight: 600,
                                    marginBottom: 10,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  CHI TIẾT {r.answers.length} CÂU TRẢ LỜI CỦA {r.user_name}:
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                  {r.answers.map((a, i) => (
                                    <div
                                      key={i}
                                      style={{
                                        padding: "10px 12px",
                                        borderRadius: 6,
                                        background: "rgba(255, 255, 255, 0.03)",
                                        border: "1px solid var(--panel-border)",
                                      }}
                                    >
                                      <div style={{ fontWeight: 500, marginBottom: 6, fontSize: 13 }}>
                                        <span style={{ color: "var(--amber)", marginRight: 6 }}>Câu {i + 1}:</span>
                                        {a.question_text}
                                      </div>
                                      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                                        Lựa chọn:{" "}
                                        <strong style={{ color: "var(--text)" }}>
                                          {a.options?.[a.selected_index] || "Không chọn"}
                                        </strong>{" "}
                                        —{" "}
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            color: a.is_correct ? "var(--ok)" : "var(--danger)",
                                          }}
                                        >
                                          {a.is_correct ? "✓ ĐÚNG" : `✗ SAI (Đáp án chuẩn: ${a.options?.[a.correct_index]})`}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="link-row no-print" style={{ marginTop: 24, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/">
            <button className="btn-secondary">← Trang chủ</button>
          </a>
          <a href="/dashboard">
            <button className="btn-secondary">Xem Dashboard Đồ họa</button>
          </a>
        </div>
        <button className="btn-secondary" onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
