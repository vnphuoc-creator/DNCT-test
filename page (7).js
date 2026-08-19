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

const ACCENT = "#f5a623";
const OK = "#45c4b0";
const WARNING = "#f59e0b";
const DANGER = "#e5484d";
const DIM = "#8fa0ae";
const DARK_BG = "#0d1620";

const tooltipStyle = {
  background: "#171f28",
  border: "1px solid #2a3542",
  borderRadius: "8px",
  color: "#eef2f5",
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

  // ---- TÍNH TOÁN DỮ LIỆU BÁO CÁO DÀNH CHO QUẢN LÝ ----
  const managerData = useMemo(() => {
    const totalAllowed = allowedUsers.length;
    const totalDone = results.length;
    const completionRate = totalAllowed > 0 ? Math.round((totalDone / totalAllowed) * 100) : 0;

    if (results.length === 0) {
      const notDoneList = allowedUsers.map((u) => ({
        id: u.id,
        name: u.full_name,
        email: u.email,
        status: "not_done",
        scoreText: "—",
        scorePercent: 0,
        tier: "Chưa tham gia",
        duration: "—",
        submittedAt: "—",
      }));
      return {
        totalAllowed,
        totalDone: 0,
        completionRate: 0,
        passRate: 0,
        avgScore: 0,
        maxScore: 0,
        minScore: 0,
        avgDurationSec: null,
        tierDistribution: [],
        systemCompetency: [],
        hardestQuestions: [],
        personnelList: notDoneList,
        passCount: 0,
        failCount: 0,
        notDoneCount: totalAllowed,
        weakestSystems: [],
      };
    }

    const percents = results.map((r) => (r.total > 0 ? Math.round((r.score / r.total) * 100) : 0));
    const avgScore = (percents.reduce((a, b) => a + b, 0) / percents.length).toFixed(1);
    const maxScore = Math.max(...percents);
    const minScore = Math.min(...percents);

    const durations = results.filter((r) => r.duration_seconds != null).map((r) => r.duration_seconds);
    const avgDurationSec = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    // Phân loại xếp hạng chuyên môn (Chuẩn đánh giá: Xuất sắc >=90%, Đạt >=80%, Cần rèn luyện <80%)
    let excellentCount = 0;
    let passCount = 0;
    let averageCount = 0;
    let weakCount = 0;

    for (const p of percents) {
      if (p >= 90) excellentCount++;
      else if (p >= 80) passCount++;
      else if (p >= 65) averageCount++;
      else weakCount++;
    }

    const standardPassCount = excellentCount + passCount; // Điểm >= 80%
    const standardPassRate = results.length > 0 ? Math.round((standardPassCount / results.length) * 100) : 0;

    const tierDistribution = [
      { name: "Xuất sắc (≥90%)", value: excellentCount, color: OK },
      { name: "Đạt chuẩn (80-89%)", value: passCount, color: "#38bdf8" },
      { name: "Trung bình (65-79%)", value: averageCount, color: WARNING },
      { name: "Cần đào tạo lại (<65%)", value: weakCount, color: DANGER },
    ].filter((t) => t.value > 0);

    // ---- Phân tích năng lực theo từng Hệ thống Kỹ thuật ----
    const categoryStats = {};
    const questionStats = {};

    for (const r of results) {
      const answers = r.answers || [];
      for (const a of answers) {
        // Thống kê câu hỏi
        const qKey = a.question_text || `#${a.question_id}`;
        if (!questionStats[qKey]) {
          questionStats[qKey] = {
            question: qKey,
            wrong: 0,
            total: 0,
            options: a.options || [],
            correct_index: a.correct_index,
          };
        }
        questionStats[qKey].total += 1;
        if (!a.is_correct) {
          questionStats[qKey].wrong += 1;
        }

        // Thống kê theo hệ thống (từ category nếu có trong answer hoặc suy luận)
        const cat = a.category || "Hệ thống chung";
        if (!categoryStats[cat]) {
          categoryStats[cat] = { correct: 0, total: 0 };
        }
        categoryStats[cat].total += 1;
        if (a.is_correct) {
          categoryStats[cat].correct += 1;
        }
      }
    }

    const systemCompetency = Object.entries(categoryStats)
      .map(([name, stat]) => {
        const accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
        return {
          name,
          accuracy,
          totalAnswers: stat.total,
          wrongAnswers: stat.total - stat.correct,
        };
      })
      .sort((a, b) => a.accuracy - b.accuracy); // Tăng dần để thấy hệ thống yếu nhất trước

    const weakestSystems = systemCompetency.filter((s) => s.accuracy < 80).slice(0, 3);

    // Top các câu hỏi sai nhiều nhất
    const hardestQuestions = Object.values(questionStats)
      .filter((q) => q.wrong > 0)
      .map((q) => ({
        ...q,
        wrongRate: q.total > 0 ? Math.round((q.wrong / q.total) * 100) : 0,
      }))
      .sort((a, b) => b.wrongRate - a.wrongRate || b.wrong - a.wrong)
      .slice(0, 8);

    // ---- Danh sách nhân sự & trạng thái ----
    const doneMap = new Map();
    for (const r of results) {
      const email = (r.email || "").toLowerCase().trim();
      const percent = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
      let tier = "Cần đào tạo lại";
      let tierClass = "badge-fail";
      if (percent >= 90) {
        tier = "Xuất sắc";
        tierClass = "badge-excellent";
      } else if (percent >= 80) {
        tier = "Đạt chuẩn";
        tierClass = "badge-pass";
      } else if (percent >= 65) {
        tier = "Trung bình";
        tierClass = "badge-fail";
      }

      doneMap.set(email, {
        id: r.id,
        name: r.user_name,
        email: r.email,
        score: r.score,
        total: r.total,
        scorePercent: percent,
        tier,
        tierClass,
        status: percent >= 80 ? "pass" : "fail",
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
        <p style={{ color: "var(--amber)", fontSize: 16 }}>Đang xử lý và tổng hợp dữ liệu báo cáo...</p>
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
      {/* Header báo cáo quản trị */}
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
        <div>
          <div className="eyebrow" style={{ color: "var(--amber)", letterSpacing: "0.08em" }}>
            BÁO CÁO QUẢN TRỊ & ĐÁNH GIÁ NĂNG LỰC KỸ THUẬT
          </div>
          <h1 style={{ margin: "4px 0 0 0", fontSize: 24, fontWeight: 700 }}>
            Kết quả Đánh giá Nội bộ Đội ĐNCT
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "var(--text-dim)" }}>
            Báo cáo chuyên môn bám sát năng lực thực tế của nhân sự tham gia làm bài
          </p>
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
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
                {managerData.totalDone}
                <span style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 400 }}>
                  /{managerData.totalAllowed}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase" }}>
                Tiến độ ({managerData.completionRate}%)
              </div>
              <div className="progress-track" style={{ marginTop: 8 }}>
                <div
                  className="progress-fill"
                  style={{ width: `${managerData.completionRate}%`, background: "var(--amber)" }}
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
              <div style={{ fontSize: 24, fontWeight: 700, color: OK, fontFamily: "var(--font-mono)" }}>
                {managerData.passRate}%
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase" }}>
                Tỷ lệ Đạt chuẩn (≥80%)
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
                {managerData.passCount} đạt / {managerData.failCount} cần ôn
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
              <div style={{ fontSize: 24, fontWeight: 700, color: "#38bdf8", fontFamily: "var(--font-mono)" }}>
                {managerData.avgScore}%
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase" }}>
                Điểm trung bình toàn đội
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
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
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-mono)" }}>
                {managerData.avgDurationSec != null ? formatDuration(managerData.avgDurationSec) : "—"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase" }}>
                Thời gian làm bài TB
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
                Quy định tối đa: 25 câu
              </div>
            </div>
          </div>

          {/* Cảnh báo trọng tâm cho Quản lý nếu có hệ thống yếu */}
          {managerData.weakestSystems.length > 0 && (
            <div
              style={{
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                <strong style={{ color: "var(--amber)" }}>Trọng tâm cần đào tạo nhắc nhở:</strong>{" "}
                Tỷ lệ trả lời chính xác đang thấp ở các hệ thống:{" "}
                {managerData.weakestSystems.map((s) => `${s.name} (${s.accuracy}%)`).join(", ")}. Quản lý
                nên bổ sung kiến thức các phần này trong buổi giao ban tới.
              </div>
            </div>
          )}

          {/* Lưới phân tích trực quan: Phân loại Năng lực & Đánh giá Hệ thống */}
          <div className="dash-grid" style={{ marginBottom: 28 }}>
            {/* 1. Đánh giá tỷ lệ thành thạo theo Hệ thống Kỹ thuật */}
            <div
              className="chart-block"
              style={{
                background: DARK_BG,
                border: "1px solid var(--panel-border)",
                borderRadius: 10,
                padding: "18px 16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: 15, margin: 0, fontWeight: 600 }}>
                  Đánh giá Năng lực theo Hệ thống
                </h2>
                <span style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase" }}>
                  Tỷ lệ đúng (%)
                </span>
              </div>

              {managerData.systemCompetency.length === 0 ? (
                <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Đang tổng hợp dữ liệu hệ thống...</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {managerData.systemCompetency.map((sys, idx) => {
                    const color = sys.accuracy >= 80 ? OK : sys.accuracy >= 65 ? WARNING : DANGER;
                    return (
                      <div key={idx}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 13,
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{sys.name}</span>
                          <span style={{ fontFamily: "var(--font-mono)", color, fontWeight: 600 }}>
                            {sys.accuracy}%{" "}
                            <span style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 400 }}>
                              ({sys.wrongAnswers > 0 ? `${sys.wrongAnswers} câu sai` : "Chuẩn"})
                            </span>
                          </span>
                        </div>
                        <div className="progress-track" style={{ height: 6 }}>
                          <div
                            className="progress-fill"
                            style={{ width: `${sys.accuracy}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Phân loại Năng lực Nhân sự (Xếp hạng) */}
            <div
              className="chart-block"
              style={{
                background: DARK_BG,
                border: "1px solid var(--panel-border)",
                borderRadius: 10,
                padding: "18px 16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: 15, margin: 0, fontWeight: 600 }}>
                  Phân loại Năng lực Nhân sự
                </h2>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  {managerData.totalDone} người đã thi
                </span>
              </div>

              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={managerData.tierDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    animationDuration={600}
                  >
                    {managerData.tierDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: DIM, fontSize: 12, paddingTop: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Lỗ hổng Kiến thức (Các câu hỏi hay sai nhất) */}
          {managerData.hardestQuestions.length > 0 && (
            <div
              className="chart-block"
              style={{
                background: DARK_BG,
                border: "1px solid var(--panel-border)",
                borderRadius: 10,
                padding: "18px 16px",
                marginBottom: 28,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 15, margin: 0, fontWeight: 600 }}>
                    Lỗ hổng Kiến thức Cần Lưu ý (Top câu hỏi sai nhiều nhất)
                  </h2>
                  <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "var(--text-dim)" }}>
                    Nhấp vào từng câu để xem chi tiết các đáp án và phương án chính xác
                  </p>
                </div>
                <span style={{ fontSize: 11, color: DANGER, fontWeight: 600 }}>
                  TỶ LỆ SAI
                </span>
              </div>

              <table>
                <thead>
                  <tr>
                    <th style={{ width: "60%" }}>Câu hỏi</th>
                    <th style={{ textAlign: "center" }}>Số lần sai</th>
                    <th style={{ textAlign: "center" }}>Tỷ lệ sai</th>
                    <th style={{ textAlign: "right" }} className="no-print">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {managerData.hardestQuestions.map((q, idx) => (
                    <React.Fragment key={idx}>
                      <tr>
                        <td style={{ fontWeight: 500 }}>
                          <span style={{ color: "var(--amber)", marginRight: 6 }}>#{idx + 1}</span>
                          {q.question}
                        </td>
                        <td style={{ textAlign: "center", fontFamily: "var(--font-mono)" }}>
                          {q.wrong}/{q.total}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            className="badge"
                            style={{
                              background: "rgba(229, 72, 77, 0.15)",
                              color: DANGER,
                              border: "1px solid rgba(229, 72, 77, 0.3)",
                            }}
                          >
                            {q.wrongRate}%
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }} className="no-print">
                          <button
                            className="btn-secondary"
                            style={{ padding: "4px 8px", fontSize: 12 }}
                            onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
                          >
                            {expandedQuestion === idx ? "Đóng" : "Xem đáp án"}
                          </button>
                        </td>
                      </tr>
                      {expandedQuestion === idx && q.options && q.options.length > 0 && (
                        <tr>
                          <td colSpan={4} style={{ background: "#131b24", padding: "12px 16px" }}>
                            <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>
                              CÁC PHƯƠNG ÁN LỰA CHỌN:
                            </div>
                            <div style={{ display: "grid", gap: 6 }}>
                              {q.options.map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  style={{
                                    fontSize: 13,
                                    padding: "6px 10px",
                                    borderRadius: 6,
                                    background: optIdx === q.correct_index ? "rgba(69, 196, 176, 0.15)" : "transparent",
                                    border: optIdx === q.correct_index ? "1px solid var(--ok)" : "1px solid var(--panel-border)",
                                    color: optIdx === q.correct_index ? "var(--ok)" : "var(--text)",
                                    fontWeight: optIdx === q.correct_index ? 600 : 400,
                                  }}
                                >
                                  {String.fromCharCode(65 + optIdx)}. {opt}{" "}
                                  {optIdx === q.correct_index && "✓ (Đáp án chuẩn)"}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bảng Theo dõi Tiến độ & Năng lực Từng Nhân sự */}
          <div
            style={{
              background: DARK_BG,
              border: "1px solid var(--panel-border)",
              borderRadius: 10,
              padding: "18px 16px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div>
                <h2 style={{ fontSize: 15, margin: 0, fontWeight: 600 }}>
                  Bảng Theo dõi & Đánh giá Năng lực Nhân sự
                </h2>
                <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "var(--text-dim)" }}>
                  Hiển thị chi tiết điểm số, thời gian làm bài và xếp loại chuyên môn
                </p>
              </div>

              {/* Bộ lọc tab */}
              <div className="no-print" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                {managerData.notDoneCount > 0 && (
                  <button
                    className={`filter-tab ${personnelFilter === "not_done" ? "active" : ""}`}
                    onClick={() => setPersonnelFilter("not_done")}
                  >
                    Chưa thi ({managerData.notDoneCount})
                  </button>
                )}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Hạng</th>
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
                              fontWeight: 600,
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
