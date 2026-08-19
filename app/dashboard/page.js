"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../../lib/supabaseClient";
import { getCurrentPeriod, formatPeriodLabel } from "../../lib/period";

const ACCENT = "#f59e0b";
const OK = "#10b981";
const WARNING = "#f59e0b";
const DANGER = "#f43f5e";
const DIM = "#94a3b8";
const DARK_BG = "#0f172a";

const tooltipStyle = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
  color: "#f8fafc",
  fontSize: "13px",
};

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}p ${s.toString().padStart(2, "0")}s`;
}

export default function DashboardPage() {
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [allResults, setAllResults] = useState([]);
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());
  const [personnelFilter, setPersonnelFilter] = useState("all"); // all | pass | fail | not_done
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [resultsRes, usersRes] = await Promise.all([
      supabase.from("quiz_results").select("*").order("created_at", { ascending: true }).limit(5000),
      supabase.from("allowed_users").select("id, full_name, email").order("full_name", { ascending: true }),
    ]);

    if (resultsRes.error) {
      setErrorMsg(resultsRes.error.message);
      setStatus("error");
      return;
    }

    setAllResults(resultsRes.data || []);
    setAllowedUsers(usersRes.data || []);
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

  // Phân tích dữ liệu báo cáo chuyên môn
  const managerData = useMemo(() => {
    const totalAllowed = allowedUsers.length || 1;
    const totalDone = results.length;
    const completionRate = Math.min(100, Math.round((totalDone / totalAllowed) * 100));

    if (totalDone === 0) {
      return {
        totalAllowed,
        totalDone: 0,
        completionRate: 0,
        passRate: 0,
        avgScore: 0,
        maxScore: 0,
        minScore: 0,
        avgDurationSec: 0,
        tierDistribution: [],
        systemCompetency: [],
        weakestSystems: [],
        hardestQuestions: [],
        personnelList: [],
      };
    }

    // 1. Phân loại theo thang điểm năng lực
    let excellentCount = 0; // >= 90%
    let passCount = 0; // 80% - 89%
    let averageCount = 0; // 65% - 79%
    let failCount = 0; // < 65%

    let totalScorePercent = 0;
    let maxScore = 0;
    let minScore = 100;
    let totalDuration = 0;
    let durationCount = 0;

    // 2. Thống kê theo Hệ thống chuyên môn
    const systemStats = {};
    const questionStats = {};

    results.forEach((r) => {
      const percent = r.total > 0 ? (r.score / r.total) * 100 : 0;
      totalScorePercent += percent;
      if (percent > maxScore) maxScore = percent;
      if (percent < minScore) minScore = percent;

      if (r.duration_seconds) {
        totalDuration += r.duration_seconds;
        durationCount += 1;
      }

      if (percent >= 90) excellentCount += 1;
      else if (percent >= 80) passCount += 1;
      else if (percent >= 65) averageCount += 1;
      else failCount += 1;

      // Chi tiết từng câu hỏi và hệ thống
      const answers = r.answers || [];
      answers.forEach((ans) => {
        const sys = ans.category || "Hệ thống chung";
        if (!systemStats[sys]) {
          systemStats[sys] = { correct: 0, total: 0 };
        }
        systemStats[sys].total += 1;
        if (ans.is_correct) systemStats[sys].correct += 1;

        // Thống kê câu hỏi khó
        const qKey = ans.question_text || `#${ans.question_id}`;
        if (!questionStats[qKey]) {
          questionStats[qKey] = {
            question: qKey,
            category: sys,
            wrong: 0,
            total: 0,
            options: ans.options || [],
            correctIndex: ans.correct_index,
          };
        }
        questionStats[qKey].total += 1;
        if (!ans.is_correct) questionStats[qKey].wrong += 1;
      });
    });

    const avgScore = (totalScorePercent / totalDone).toFixed(1);
    const avgDurationSec = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;
    const standardPassCount = excellentCount + passCount;
    const standardPassRate = Math.round((standardPassCount / totalDone) * 100);

    // Dữ liệu biểu đồ phân bố xếp loại
    const tierDistribution = [
      { name: "Xuất sắc (≥90%)", value: excellentCount, color: "#10b981", percent: Math.round((excellentCount / totalDone) * 100) },
      { name: "Đạt chuẩn (80-89%)", value: passCount, color: "#0284c7", percent: Math.round((passCount / totalDone) * 100) },
      { name: "Trung bình (65-79%)", value: averageCount, color: "#f59e0b", percent: Math.round((averageCount / totalDone) * 100) },
      { name: "Cần đào tạo lại (<65%)", value: failCount, color: "#f43f5e", percent: Math.round((failCount / totalDone) * 100) },
    ].filter((t) => t.value > 0);

    // Năng lực theo hệ thống
    const systemCompetency = Object.entries(systemStats)
      .map(([name, s]) => {
        const passPct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
        return {
          name,
          correct: s.correct,
          total: s.total,
          passPct,
          status: passPct >= 80 ? "Đạt" : passPct >= 65 ? "Cảnh báo" : "Yếu",
        };
      })
      .sort((a, b) => a.passPct - b.passPct);

    const weakestSystems = systemCompetency.filter((s) => s.passPct < 80);

    // Top câu hỏi hay sai
    const hardestQuestions = Object.values(questionStats)
      .map((q) => ({
        ...q,
        wrongRate: q.total > 0 ? Math.round((q.wrong / q.total) * 100) : 0,
      }))
      .filter((q) => q.wrong > 0)
      .sort((a, b) => b.wrongRate - a.wrongRate || b.wrong - a.wrong)
      .slice(0, 10);

    // Danh sách nhân sự & tiến độ làm bài
    const doneMap = new Map();
    for (const r of results) {
      const email = (r.email || "").toLowerCase().trim();
      const scorePct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
      let tier = "Cần đào tạo lại";
      let tierClass = "badge-fail";
      let status = "fail";

      if (scorePct >= 90) {
        tier = "Xuất sắc";
        tierClass = "badge-excellent";
        status = "pass";
      } else if (scorePct >= 80) {
        tier = "Đạt chuẩn";
        tierClass = "badge-pass";
        status = "pass";
      } else if (scorePct >= 65) {
        tier = "Trung bình";
        tierClass = "badge-fail";
        status = "fail";
      }

      doneMap.set(email || r.user_name, {
        id: r.id,
        name: r.user_name,
        email: r.email,
        score: r.score,
        total: r.total,
        scorePercent: scorePct,
        tier,
        tierClass,
        status,
        duration: formatDuration(r.duration_seconds),
        submittedAt: new Date(r.created_at).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }

    const personnelList = [];
    const processedEmails = new Set();

    // 1. Những người đã làm bài
    for (const item of Array.from(doneMap.values())) {
      personnelList.push(item);
      if (item.email) processedEmails.add(item.email.toLowerCase().trim());
    }

    // 2. Những người chưa làm bài
    if (selectedPeriod !== "all") {
      for (const u of allowedUsers) {
        const uEmail = (u.email || "").toLowerCase().trim();
        if (!processedEmails.has(uEmail)) {
          personnelList.push({
            id: `not_done_${u.id}`,
            name: u.full_name,
            email: u.email,
            score: null,
            total: null,
            scorePercent: 0,
            tier: "Chưa tham gia",
            tierClass: "badge-pending",
            status: "not_done",
            duration: "—",
            submittedAt: "—",
          });
        }
      }
    }

    // Sắp xếp: điểm cao nhất lên đầu, chưa làm ở cuối
    personnelList.sort((a, b) => {
      if (a.status === "not_done" && b.status !== "not_done") return 1;
      if (a.status !== "not_done" && b.status === "not_done") return -1;
      return b.scorePercent - a.scorePercent;
    });

    const notDoneCount = personnelList.filter((p) => p.status === "not_done").length;

    return {
      totalAllowed,
      totalDone,
      completionRate,
      passRate: standardPassRate,
      avgScore,
      maxScore,
      minScore,
      avgDurationSec,
      tierDistribution,
      systemCompetency,
      weakestSystems,
      hardestQuestions,
      personnelList,
      passCount: standardPassCount,
      failCount: totalDone - standardPassCount,
      notDoneCount,
    };
  }, [results, allowedUsers, selectedPeriod]);

  // Lọc bảng nhân sự
  const filteredPersonnel = useMemo(() => {
    if (!managerData?.personnelList) return [];
    if (personnelFilter === "all") return managerData.personnelList;
    if (personnelFilter === "pass") return managerData.personnelList.filter((p) => p.status === "pass");
    if (personnelFilter === "fail") return managerData.personnelList.filter((p) => p.status === "fail");
    if (personnelFilter === "not_done") return managerData.personnelList.filter((p) => p.status === "not_done");
    return managerData.personnelList;
  }, [managerData, personnelFilter]);

  async function handleLogout() {
    await fetch("/api/admin-logout", { method: "POST" });
    window.location.href = "/";
  }

  if (status === "loading") {
    return (
      <div className="card" style={{ textAlign: "center", padding: "40px" }}>
        <p style={{ color: "var(--brand-cyan)", fontSize: 16 }}>Đang xử lý và tổng hợp dữ liệu báo cáo...</p>
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

      {/* On-screen Header */}
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
              BÁO CÁO QUẢN TRỊ & ĐÁNH GIÁ NĂNG LỰC KỸ THUẬT
            </div>
            <h1 style={{ margin: "2px 0 0 0", fontSize: 22, fontWeight: 800 }}>
              Kết quả Đánh giá Năng lực Nội bộ Đội ĐNCT
            </h1>
            <p style={{ margin: "2px 0 0 0", fontSize: 13.5, color: "var(--text-dim)" }}>
              Phân tích chỉ số hoàn thành, tỷ lệ đạt chuẩn và phát hiện lỗ hổng chuyên môn
            </p>
          </div>
        </div>

        {/* Bộ điều khiển & In báo cáo */}
        <div className="no-print" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            id="period-select"
            className="field"
            style={{ maxWidth: 220, margin: 0, padding: "8px 12px", fontSize: 13 }}
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value={getCurrentPeriod()}>
              {formatPeriodLabel(getCurrentPeriod())} (Kỳ hiện tại)
            </option>
            {availablePeriods
              .filter((p) => p !== getCurrentPeriod())
              .map((p) => (
                <option key={p} value={p}>
                  {p === "khong-ro" ? "Dữ liệu cũ" : formatPeriodLabel(p)}
                </option>
              ))}
            <option value="all">Tất cả các kỳ</option>
          </select>

          <button
            className="btn-primary"
            style={{ padding: "8px 16px", fontSize: 13, whiteSpace: "nowrap" }}
            onClick={() => window.print()}
          >
            In / Xuất PDF
          </button>
        </div>
      </div>

      {managerData.totalDone === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ fontSize: 16, color: "var(--text-dim)" }}>
            Chưa có dữ liệu làm bài nào trong kỳ này. Thử chọn kỳ khác ở menu trên.
          </p>
        </div>
      ) : (
        <div className="dashboard-fade">
          {/* Executive Summary Cards (Chỉ số trọng yếu) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div
              className="stat-box"
              style={{
                background: DARK_BG,
                border: "1px solid var(--panel-border)",
                borderRadius: 10,
                padding: "16px 14px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--brand-cyan)", fontFamily: "var(--font-mono)" }}>
                {managerData.totalDone}
                <span style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 400 }}>
                  /{managerData.totalAllowed}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase", fontWeight: 600 }}>
                Tiến độ ({managerData.completionRate}%)
              </div>
              <div className="progress-track" style={{ marginTop: 8 }}>
                <div
                  className="progress-fill"
                  style={{ width: `${managerData.completionRate}%`, background: "var(--brand-cyan)" }}
                />
              </div>
            </div>

            <div
              className="stat-box"
              style={{
                background: DARK_BG,
                border: "1px solid var(--panel-border)",
                borderRadius: 10,
                padding: "16px 14px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 800, color: OK, fontFamily: "var(--font-mono)" }}>
                {managerData.passRate}%
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase", fontWeight: 600 }}>
                Đạt chuẩn ({managerData.passCount}/{managerData.totalDone})
              </div>
              <div style={{ fontSize: 11, color: OK, marginTop: 4 }}>
                {managerData.passRate >= 80 ? "✓ Đạt chỉ tiêu đội" : "⚠ Cần bổ sung đào tạo"}
              </div>
            </div>

            <div
              className="stat-box"
              style={{
                background: DARK_BG,
                border: "1px solid var(--panel-border)",
                borderRadius: 10,
                padding: "16px 14px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
                {managerData.avgScore}%
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase", fontWeight: 600 }}>
                Điểm TB toàn đội
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
                Cao nhất: {managerData.maxScore}% | Thấp: {managerData.minScore}%
              </div>
            </div>

            <div
              className="stat-box"
              style={{
                background: DARK_BG,
                border: "1px solid var(--panel-border)",
                borderRadius: 10,
                padding: "16px 14px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 800, color: "#38bdf8", fontFamily: "var(--font-mono)" }}>
                {formatDuration(managerData.avgDurationSec)}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase", fontWeight: 600 }}>
                Thời gian làm bài TB
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
                Quy định tối đa: 30 phút
              </div>
            </div>
          </div>

          {/* Phân tích hệ thống & Cảnh báo quản lý */}
          <div
            style={{
              background: DARK_BG,
              border: "1px solid var(--panel-border)",
              borderRadius: 10,
              padding: "18px 20px",
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>
                Đánh giá Tỷ lệ Đạt theo Từng Hệ thống Kỹ thuật
              </h2>
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                Chuẩn đạt yêu cầu: <strong>≥80%</strong>
              </span>
            </div>

            {/* Cảnh báo trọng tâm */}
            {managerData.weakestSystems.length > 0 && (
              <div
                style={{
                  background: "rgba(244, 63, 94, 0.1)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 700, color: "#fb7185", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>⚠ CẢNH BÁO QUẢN LÝ: CÓ {managerData.weakestSystems.length} HỆ THỐNG CẦN ĐÀO TẠO BỔ SUNG</span>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#fecdd3" }}>
                  Đội ngũ đang trả lời sai nhiều nhất tại:{" "}
                  <strong>{managerData.weakestSystems.map((s) => `${s.name} (${s.passPct}%)`).join(", ")}</strong>.
                  Đề xuất Quản lý đưa nội dung này vào buổi sinh hoạt chuyên môn hoặc giao ban đầu ca.
                </p>
              </div>
            )}

            {/* Thanh đo năng lực từng hệ thống */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px 20px" }}>
              {managerData.systemCompetency.map((sys) => {
                const isPass = sys.passPct >= 80;
                const isWarn = sys.passPct >= 65 && sys.passPct < 80;
                const barColor = isPass ? OK : isWarn ? WARNING : DANGER;
                return (
                  <div key={sys.name} style={{ padding: "8px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>{sys.name}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: barColor }}>
                        {sys.passPct}% ({sys.correct}/{sys.total} câu)
                      </span>
                    </div>
                    <div className="progress-track" style={{ height: 8 }}>
                      <div className="progress-fill" style={{ width: `${sys.passPct}%`, background: barColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid 2 cột: Biểu đồ xếp loại & Top câu hỏi khó */}
          <div className="dash-grid" style={{ marginBottom: 24 }}>
            {/* Cột 1: Phân bố Xếp loại */}
            <div
              className="chart-block"
              style={{
                background: DARK_BG,
                border: "1px solid var(--panel-border)",
                borderRadius: 10,
                padding: "18px 16px",
              }}
            >
              <h2 style={{ fontSize: 16, margin: "0 0 4px 0", fontWeight: 700 }}>
                Phân loại Năng lực Nhân sự
              </h2>
              <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 12px 0" }}>
                Căn cứ theo mức điểm đạt được trong kỳ thi
              </p>

              <div style={{ height: 210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={managerData.tierDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {managerData.tierDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: "flex", justifyContent: "space-around", marginTop: 8, textAlign: "center" }}>
                {managerData.tierDistribution.map((t) => (
                  <div key={t.name}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: t.color, fontFamily: "var(--font-mono)" }}>
                      {t.value} ({t.percent}%)
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{t.name.split(" ")[0]}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cột 2: Phân tích Lỗ hổng Kiến thức */}
            <div
              className="chart-block"
              style={{
                background: DARK_BG,
                border: "1px solid var(--panel-border)",
                borderRadius: 10,
                padding: "18px 16px",
              }}
            >
              <h2 style={{ fontSize: 16, margin: "0 0 4px 0", fontWeight: 700 }}>
                Lỗ hổng Kiến thức (Top câu hỏi sai nhiều nhất)
              </h2>
              <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 12px 0" }}>
                Các câu hỏi có tỷ lệ trả lời sai cao nhất trong kỳ
              </p>

              {managerData.hardestQuestions.length === 0 ? (
                <p style={{ fontSize: 13, color: OK, padding: "20px 0", textAlign: "center" }}>
                  Toàn bộ nhân sự đều trả lời đúng các câu hỏi!
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 260, overflowY: "auto" }}>
                  {managerData.hardestQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 6,
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid var(--panel-border)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", flex: 1 }}>
                          <span style={{ color: "var(--amber)", marginRight: 6 }}>#{idx + 1}</span>
                          {q.question}
                        </div>
                        <span
                          className="badge badge-fail"
                          style={{ fontSize: 11, padding: "2px 6px", whiteSpace: "nowrap" }}
                        >
                          Sai {q.wrongRate}% ({q.wrong}/{q.total})
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--brand-cyan)", textTransform: "uppercase" }}>
                          {q.category}
                        </span>
                        <button
                          className="btn-secondary no-print"
                          style={{ padding: "2px 8px", fontSize: 11 }}
                          onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
                        >
                          {expandedQuestion === idx ? "Ẩn đáp án" : "Xem đáp án"}
                        </button>
                      </div>

                      {expandedQuestion === idx && q.options && (
                        <div
                          style={{
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: "1px dashed var(--panel-border)",
                            fontSize: 12,
                          }}
                        >
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              style={{
                                padding: "4px 6px",
                                borderRadius: 4,
                                color: oIdx === q.correctIndex ? OK : "var(--text-dim)",
                                fontWeight: oIdx === q.correctIndex ? 700 : 400,
                              }}
                            >
                              {oIdx === q.correctIndex ? "✓ Đáp án đúng: " : "• "}
                              {opt}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bảng Theo dõi & Xếp hạng Nhân sự Chi tiết */}
          <div
            style={{
              background: DARK_BG,
              border: "1px solid var(--panel-border)",
              borderRadius: 10,
              padding: "18px 16px",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div>
                <h2 style={{ fontSize: 16, margin: "0 0 2px 0", fontWeight: 700 }}>
                  Bảng Theo dõi Tiến độ & Xếp hạng Nhân sự
                </h2>
                <p style={{ fontSize: 12, color: "var(--text-dim)", margin: 0 }}>
                  Tổng số: {managerData.personnelList.length} nhân sự ({managerData.totalDone} đã hoàn thành, {managerData.notDoneCount} chưa thi)
                </p>
              </div>

              {/* Tabs lọc nhanh */}
              <div className="no-print" style={{ display: "flex", gap: 6 }}>
                <button
                  className={`filter-tab ${personnelFilter === "all" ? "active" : ""}`}
                  onClick={() => setPersonnelFilter("all")}
                >
                  Tất cả ({managerData.personnelList.length})
                </button>
                <button
                  className={`filter-tab ${personnelFilter === "pass" ? "active" : ""}`}
                  onClick={() => setPersonnelFilter("pass")}
                >
                  Đạt chuẩn ({managerData.passCount})
                </button>
                <button
                  className={`filter-tab ${personnelFilter === "fail" ? "active" : ""}`}
                  onClick={() => setPersonnelFilter("fail")}
                >
                  Cần ôn lại ({managerData.failCount})
                </button>
                <button
                  className={`filter-tab ${personnelFilter === "not_done" ? "active" : ""}`}
                  onClick={() => setPersonnelFilter("not_done")}
                >
                  Chưa thi ({managerData.notDoneCount})
                </button>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Hạng</th>
                  <th>Họ và tên</th>
                  <th>Email</th>
                  <th style={{ textAlign: "center" }}>Kết quả</th>
                  <th style={{ textAlign: "center" }}>Tỷ lệ</th>
                  <th style={{ textAlign: "center" }}>Thời gian</th>
                  <th style={{ textAlign: "right" }}>Xếp loại</th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonnel.map((p, idx) => (
                  <tr key={p.id || idx}>
                    <td style={{ fontFamily: "var(--font-mono)", color: idx < 3 && p.status !== "not_done" ? "var(--amber)" : "var(--text-dim)" }}>
                      {p.status === "not_done" ? "—" : `#${idx + 1}`}
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--text)" }}>{p.name}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>
                      {p.email || "—"}
                    </td>
                    <td style={{ textAlign: "center", fontFamily: "var(--font-mono)" }}>
                      {p.score !== null ? `${p.score}/${p.total}` : "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {p.status !== "not_done" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                              color: p.scorePercent >= 80 ? OK : DANGER,
                            }}
                          >
                            {p.scorePercent}%
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-dim)", fontSize: 12 }}>Chưa làm</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center", fontSize: 13, color: "var(--text-dim)" }}>
                      {p.duration}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`badge ${p.tierClass}`}>{p.tier}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Official Enterprise Print Footer (Chữ ký xác nhận 3 cấp) */}
          <div className="print-official-footer" style={{ display: "none" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>NGƯỜI LẬP BÁO CÁO</div>
              <div style={{ fontSize: 9, color: "#64748b", fontStyle: "italic", marginTop: 2 }}>(Ký và ghi rõ họ tên)</div>
              <div style={{ height: 55 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>ĐỘI TRƯỞNG ĐỘI ĐNCT</div>
              <div style={{ fontSize: 9, color: "#64748b", fontStyle: "italic", marginTop: 2 }}>(Ký và ghi rõ họ tên)</div>
              <div style={{ height: 55 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>TRƯỞNG PHÒNG KỸ THUẬT</div>
              <div style={{ fontSize: 9, color: "#64748b", fontStyle: "italic", marginTop: 2 }}>(Ký duyệt)</div>
              <div style={{ height: 55 }} />
            </div>
          </div>
        </div>
      )}

      {/* Footer navigation */}
      <div className="link-row no-print" style={{ marginTop: 24, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/">
            <button className="btn-secondary">← Trang chủ</button>
          </a>
          <a href="/report">
            <button className="btn-primary">Xuất báo cáo Excel chi tiết</button>
          </a>
        </div>
        <button className="btn-secondary" onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
