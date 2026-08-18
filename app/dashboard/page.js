"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
const WRONG = "#e5484d";
const DIM = "#8fa0ae";

const tooltipStyle = { background: "#0d1620", border: "1px solid #26333f", color: "#eef2f5" };

function dayKey(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export default function DashboardPage() {
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [allResults, setAllResults] = useState([]);
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());

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

  // ---- Dữ liệu cho các biểu đồ ----
  const charts = useMemo(() => {
    if (results.length === 0) return null;

    const percents = results.map((r) => (r.total > 0 ? Math.round((r.score / r.total) * 100) : 0));
    const avg = percents.reduce((a, b) => a + b, 0) / percents.length;
    const max = Math.max(...percents);
    const min = Math.min(...percents);

    const durations = results.filter((r) => r.duration_seconds != null).map((r) => r.duration_seconds);
    const avgDurationSec = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    // ---- Nhóm theo NGÀY nộp bài (khớp bố cục dashboard mẫu) ----
    const dayMap = {}; // "dd/mm" -> { count, scoreSum, pass, fail }
    for (const r of results) {
      const key = dayKey(r.created_at);
      if (!dayMap[key]) dayMap[key] = { count: 0, scoreSum: 0, pass: 0, fail: 0 };
      const percent = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
      dayMap[key].count += 1;
      dayMap[key].scoreSum += percent;
      if (percent >= 50) dayMap[key].pass += 1;
      else dayMap[key].fail += 1;
    }
    // Giữ đúng thứ tự thời gian xuất hiện (đã load theo created_at tăng dần)
    const dayKeysInOrder = [];
    for (const r of results) {
      const key = dayKey(r.created_at);
      if (!dayKeysInOrder.includes(key)) dayKeysInOrder.push(key);
    }

    const participantsByDay = dayKeysInOrder.map((k) => ({
      ngay: k,
      "Số người tham gia": dayMap[k].count,
    }));
    const avgScoreByDay = dayKeysInOrder.map((k) => ({
      ngay: k,
      "Điểm trung bình": Math.round((dayMap[k].scoreSum / dayMap[k].count) * 10) / 10,
    }));
    const passFailByDay = dayKeysInOrder.map((k) => ({
      ngay: k,
      "Đạt": dayMap[k].pass,
      "Không đạt": dayMap[k].fail,
    }));

    // Phân bố điểm theo khoảng 10%
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${i * 10 + 10}%`,
      "Số người": 0,
    }));
    for (const p of percents) {
      const idx = Math.min(Math.floor(p / 10), 9);
      buckets[idx]["Số người"] += 1;
    }

    // Đậu / rớt (ngưỡng 50%)
    const passCount = percents.filter((p) => p >= 50).length;
    const failCount = percents.length - passCount;
    const passFail = [
      { name: "Đạt (≥50%)", value: passCount },
      { name: "Chưa đạt (<50%)", value: failCount },
    ];

    // Điểm cá nhân (mỗi người 1 lượt trong kỳ đang chọn)
    const personalScores = [...results]
      .map((r) => ({
        ten: r.user_name,
        "Điểm": r.total > 0 ? Math.round((r.score / r.total) * 100) : 0,
      }))
      .sort((a, b) => b["Điểm"] - a["Điểm"]);

    // Câu hỏi hay sai nhất
    const questionStats = {};
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
        question: question.length > 40 ? question.slice(0, 40) + "…" : question,
        "Tỷ lệ sai %": s.total > 0 ? Math.round((s.wrong / s.total) * 100) : 0,
      }))
      .filter((q) => q["Tỷ lệ sai %"] > 0)
      .sort((a, b) => b["Tỷ lệ sai %"] - a["Tỷ lệ sai %"])
      .slice(0, 10)
      .reverse();

    // Những người CHƯA làm bài trong kỳ đang chọn (so với danh sách đăng ký)
    const doneEmails = new Set(results.map((r) => (r.email || "").toLowerCase().trim()));
    const notDoneYet =
      selectedPeriod === "all"
        ? []
        : allowedUsers.filter((u) => !doneEmails.has((u.email || "").toLowerCase().trim()));

    return {
      count: results.length,
      avg: avg.toFixed(1),
      max,
      min,
      avgDurationSec,
      buckets,
      passFail,
      hardestQuestions,
      participantsByDay,
      avgScoreByDay,
      passFailByDay,
      personalScores,
      passCount,
      failCount,
      notDoneYet,
    };
  }, [results, allowedUsers, selectedPeriod]);

  const periodSelector = (
    <div style={{ marginBottom: 20 }} className="no-print">
      <label
        htmlFor="period-select"
        style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--text-dim)" }}
      >
        Xem dashboard của
      </label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <select
          id="period-select"
          className="field"
          style={{ maxWidth: 260, marginBottom: 0 }}
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
        >
          <option value={getCurrentPeriod()}>
            {formatPeriodLabel(getCurrentPeriod())} (kỳ hiện tại)
          </option>
          {availablePeriods
            .filter((p) => p !== getCurrentPeriod())
            .map((p) => (
              <option key={p} value={p}>
                {p === "khong-ro" ? "Không rõ kỳ (dữ liệu cũ)" : formatPeriodLabel(p)}
              </option>
            ))}
          <option value="all">Tất cả các kỳ</option>
        </select>
        <button className="btn-primary" onClick={() => window.print()}>
          In / Xuất PDF
        </button>
      </div>
    </div>
  );

  async function handleLogout() {
    await fetch("/api/admin-logout", { method: "POST" });
    window.location.href = "/";
  }

  if (status === "loading") {
    return (
      <div className="card">
        <p>Đang tải dữ liệu...</p>
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
    <div className="card dashboard-print-area" style={{ maxWidth: 1100 }}>
      <div className="eyebrow">Dashboard</div>
      <h1>Kết quả kiểm tra kiến thức nội bộ</h1>
      {periodSelector}

      {!charts ? (
        <p>Chưa có ai làm bài trong khoảng này cả. Thử chọn kỳ khác ở trên.</p>
      ) : (
        <div key={selectedPeriod} className="dashboard-fade">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
              margin: "20px 0 32px",
            }}
          >
            <StatBox label="Lượt làm bài" value={charts.count} />
            <StatBox label="Số người ĐẠT" value={charts.passCount} valueColor={OK} />
            <StatBox label="Số người CHƯA ĐẠT" value={charts.failCount} valueColor={WRONG} />
            <StatBox label="Điểm TB" value={`${charts.avg}%`} />
            <StatBox
              label="TG làm bài TB"
              value={
                charts.avgDurationSec != null
                  ? `${Math.floor(charts.avgDurationSec / 60)}p${(charts.avgDurationSec % 60)
                      .toString()
                      .padStart(2, "0")}`
                  : "—"
              }
            />
          </div>

          <div className="dash-grid">
            <ChartBlock title="Số người tham gia làm bài theo ngày">
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={charts.participantsByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26333f" />
                  <XAxis dataKey="ngay" tick={{ fill: DIM, fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: DIM, fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="Số người tham gia"
                    stroke={ACCENT}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    animationDuration={700}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartBlock>

            <ChartBlock title="Tỷ lệ Đạt / Chưa đạt (ngưỡng 50%)">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={charts.passFail}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    animationDuration={700}
                  >
                    <Cell fill={OK} />
                    <Cell fill={WRONG} />
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: DIM, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartBlock>

            <ChartBlock title="Điểm trung bình theo ngày">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={charts.avgScoreByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26333f" />
                  <XAxis dataKey="ngay" tick={{ fill: DIM, fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: DIM, fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="Điểm trung bình" fill={ACCENT} radius={[6, 6, 0, 0]} animationDuration={700} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBlock>

            <ChartBlock title="Số lượng Đạt và Không đạt theo ngày">
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={charts.passFailByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26333f" />
                  <XAxis dataKey="ngay" tick={{ fill: DIM, fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: DIM, fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: DIM, fontSize: 12 }} />
                  <Line type="monotone" dataKey="Đạt" stroke={OK} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Không đạt" stroke={WRONG} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartBlock>
          </div>

          <ChartBlock title={`Điểm cá nhân (${charts.personalScores.length} người)`}>
            <ResponsiveContainer width="100%" height={Math.max(240, charts.personalScores.length * 26)}>
              <BarChart data={charts.personalScores} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26333f" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: DIM, fontSize: 12 }} />
                <YAxis type="category" dataKey="ten" width={150} tick={{ fill: DIM, fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="Điểm" radius={[0, 6, 6, 0]} animationDuration={700}>
                  {charts.personalScores.map((entry, i) => (
                    <Cell key={i} fill={entry["Điểm"] >= 50 ? OK : WRONG} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartBlock>

          {selectedPeriod !== "all" && (
            <ChartBlock title={`Những người chưa làm bài kiểm tra (${charts.notDoneYet.length} người)`}>
              {charts.notDoneYet.length === 0 ? (
                <p style={{ color: OK }}>Không có ai — mọi người đã làm bài đầy đủ trong kỳ này.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Họ tên</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charts.notDoneYet.map((u) => (
                      <tr key={u.id}>
                        <td>{u.full_name}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{u.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ChartBlock>
          )}

          <ChartBlock title="Phân bố điểm số">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={charts.buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26333f" />
                <XAxis dataKey="range" tick={{ fill: DIM, fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: DIM, fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="Số người" fill={ACCENT} radius={[6, 6, 0, 0]} animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBlock>

          {charts.hardestQuestions.length > 0 && (
            <ChartBlock title="Top 10 câu hỏi hay bị sai nhất">
              <ResponsiveContainer width="100%" height={Math.max(260, charts.hardestQuestions.length * 34)}>
                <BarChart data={charts.hardestQuestions} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26333f" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: DIM, fontSize: 12 }} />
                  <YAxis type="category" dataKey="question" width={220} tick={{ fill: DIM, fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="Tỷ lệ sai %" fill={WRONG} radius={[0, 6, 6, 0]} animationDuration={700} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBlock>
          )}
        </div>
      )}

      <div className="link-row no-print" style={{ marginTop: 24 }}>
        <a href="/">
          <button className="btn-secondary">← Trang chủ</button>
        </a>
        <a href="/report">
          <button className="btn-primary">Xem báo cáo chi tiết</button>
        </a>
        <button className="btn-secondary" onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

function ChartBlock({ title, children }) {
  return (
    <div className="chart-block" style={{ marginBottom: 30 }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>{title}</h2>
      {children}
    </div>
  );
}

function StatBox({ label, value, valueColor }) {
  return (
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
      <div style={{ fontSize: 20, fontFamily: "var(--font-mono)", color: valueColor || "var(--amber)" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}
