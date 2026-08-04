"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function ReportPage() {
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [errorMsg, setErrorMsg] = useState("");
  const [results, setResults] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadResults();
  }, []);

  async function loadResults() {
    const { data, error } = await supabase
      .from("quiz_results")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }
    setResults(data || []);
    setStatus("ready");
  }

  // ---- Tính toán số liệu tổng quan ----
  const stats = useMemo(() => {
    if (results.length === 0) return null;

    const percents = results.map((r) => (r.total > 0 ? (r.score / r.total) * 100 : 0));
    const avg = percents.reduce((a, b) => a + b, 0) / percents.length;
    const max = Math.max(...percents);
    const min = Math.min(...percents);

    // Đếm số lần sai theo từng câu hỏi (dựa vào question_text lưu trong answers)
    const questionStats = {}; // question_text -> { wrong, total }
    for (const r of results) {
      const answers = r.answers || [];
      for (const a of answers) {
        const key = a.question_text || `#${a.question_id}`;
        if (!questionStats[key]) questionStats[key] = { wrong: 0, total: 0 };
        questionStats[key].total += 1;
        if (!a.is_correct) questionStats[key].wrong += 1;
      }
    }
    const hardestQuestions = Object.entries(questionStats)
      .map(([question, s]) => ({
        question,
        wrong: s.wrong,
        total: s.total,
        wrongRate: s.total > 0 ? Math.round((s.wrong / s.total) * 100) : 0,
      }))
      .filter((q) => q.wrong > 0)
      .sort((a, b) => b.wrongRate - a.wrongRate || b.wrong - a.wrong)
      .slice(0, 15);

    return {
      count: results.length,
      avg: avg.toFixed(1),
      max: max.toFixed(0),
      min: min.toFixed(0),
      hardestQuestions,
    };
  }, [results]);

  async function handleLogout() {
    await fetch("/api/admin-logout", { method: "POST" });
    window.location.href = "/";
  }

  async function handleExportExcel() {
    const XLSX = await import("xlsx");

    // Sheet 1: Tổng quan
    const overviewSheetData = [
      ["Tổng số lượt làm bài", stats.count],
      ["Điểm trung bình (%)", stats.avg],
      ["Điểm cao nhất (%)", stats.max],
      ["Điểm thấp nhất (%)", stats.min],
    ];

    // Sheet 2: Câu hỏi hay sai nhất
    const hardestSheetData = [
      ["Câu hỏi", "Số lần sai", "Số lần xuất hiện", "Tỷ lệ sai (%)"],
      ...stats.hardestQuestions.map((q) => [q.question, q.wrong, q.total, q.wrongRate]),
    ];

    // Sheet 3: Chi tiết từng người + từng câu
    const detailSheetData = [
      ["Tên", "Điểm", "Tổng câu", "Tỷ lệ (%)", "Thời gian", "Câu hỏi", "Trả lời", "Đáp án đúng", "Kết quả"],
    ];
    for (const r of results) {
      const answers = r.answers || [];
      const percent = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
      const time = new Date(r.created_at).toLocaleString("vi-VN");
      if (answers.length === 0) {
        detailSheetData.push([r.user_name, r.score, r.total, percent, time, "", "", "", ""]);
      } else {
        for (const a of answers) {
          detailSheetData.push([
            r.user_name,
            r.score,
            r.total,
            percent,
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
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overviewSheetData), "Tong quan");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hardestSheetData), "Cau hoi hay sai");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detailSheetData), "Chi tiet");

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `bao-cao-bai-test-${dateStr}.xlsx`);
  }

  if (status === "loading") {
    return (
      <div className="card">
        <p>Đang tải dữ liệu báo cáo...</p>
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

  if (!stats) {
    return (
      <div className="card">
        <div className="eyebrow">Báo cáo</div>
        <h2>Chưa có dữ liệu</h2>
        <p>Chưa có ai làm bài cả, quay lại đây sau khi có người hoàn thành bài test.</p>
        <a href="/">← Quay lại trang chủ</a>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 900 }}>
      <div className="eyebrow">Báo cáo</div>
      <h2>Kết quả tổng hợp</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          margin: "20px 0",
        }}
      >
        <StatBox label="Lượt làm bài" value={stats.count} />
        <StatBox label="Điểm TB" value={`${stats.avg}%`} />
        <StatBox label="Cao nhất" value={`${stats.max}%`} />
        <StatBox label="Thấp nhất" value={`${stats.min}%`} />
      </div>

      <button className="btn-primary" onClick={handleExportExcel} style={{ marginBottom: 32 }}>
        Xuất báo cáo ra Excel
      </button>

      <h2>Câu hỏi bị sai nhiều nhất</h2>
      {stats.hardestQuestions.length === 0 ? (
        <p>Chưa có câu nào bị trả lời sai — mọi người làm tốt lắm!</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Câu hỏi</th>
              <th>Sai</th>
              <th>Tỷ lệ sai</th>
            </tr>
          </thead>
          <tbody>
            {stats.hardestQuestions.map((q, i) => (
              <tr key={i}>
                <td>{q.question}</td>
                <td>
                  {q.wrong}/{q.total}
                </td>
                <td>{q.wrongRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ marginTop: 32 }}>Chi tiết từng người</h2>
      <table>
        <thead>
          <tr>
            <th>Tên</th>
            <th>Điểm</th>
            <th>Thời gian</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <>
              <tr key={r.id}>
                <td>{r.user_name}</td>
                <td>
                  {r.score}/{r.total}
                </td>
                <td>{new Date(r.created_at).toLocaleString("vi-VN")}</td>
                <td>
                  <button
                    className="btn-secondary"
                    style={{ padding: "6px 10px", fontSize: 13 }}
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    {expandedId === r.id ? "Ẩn" : "Xem"}
                  </button>
                </td>
              </tr>
              {expandedId === r.id && (
                <tr>
                  <td colSpan={4} style={{ background: "#0d1620" }}>
                    {(r.answers || []).length === 0 ? (
                      <p style={{ margin: "8px 0" }}>
                        Lượt làm bài này chưa lưu chi tiết từng câu (thực hiện trước khi tính năng
                        này được bật).
                      </p>
                    ) : (
                      <div style={{ padding: "8px 0" }}>
                        {r.answers.map((a, i) => (
                          <div
                            key={i}
                            style={{
                              padding: "8px 0",
                              borderBottom: "1px solid var(--panel-border)",
                            }}
                          >
                            <div style={{ marginBottom: 4 }}>
                              {i + 1}. {a.question_text}
                            </div>
                            <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                              Trả lời: {a.options?.[a.selected_index]} —{" "}
                              <span style={{ color: a.is_correct ? "var(--accent)" : "var(--wrong)" }}>
                                {a.is_correct ? "Đúng" : `Sai (đáp án đúng: ${a.options?.[a.correct_index]})`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>

      <div className="link-row">
        <a href="/">
          <button className="btn-secondary">← Trang chủ</button>
        </a>
        <button className="btn-secondary" onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div
      style={{
        background: "#0d1620",
        border: "1px solid var(--panel-border)",
        borderRadius: 10,
        padding: "14px 12px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, fontFamily: "var(--font-display)", color: "var(--accent)" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}
