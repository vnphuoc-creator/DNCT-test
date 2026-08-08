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

export default function DashboardPage() {
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [allResults, setAllResults] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());

  useEffect(() => {
    loadResults();
  }, []);

  async function loadResults() {
    const { data, error } = await supabase
      .from("quiz_results")
      .select("*")
      .order("created_at", { ascending: true })
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

    // Phân bố điểm theo khoảng 10%
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${i * 10 + 10}%`,
      "Số người": 0,
    }));
    for (const p of percents) {
      const idx = Math.min(Math.floor(p / 10), 9);
      buckets[idx]["Số người"] += 1;
    }

    // Xu hướng điểm theo thời gian (theo thứ tự nộp bài)
    const trend = results.map((r, i) => ({
      lan: i + 1,
      "Điểm %": r.total > 0 ? Math.round((r.score / r.total) * 100) : 0,
      ten: r.user_name,
    }));

    // Đậu / rớt (ngưỡng 50%)
    const passCount = percents.filter((p) => p >= 50).length;
    const failCount = percents.length - passCount;
    const passFail = [
      { name: "Đạt (≥50%)", value: passCount },
      { name: "Chưa đạt (<50%)", value: failCount },
    ];

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
      .reverse(); // để cột cao nhất nằm trên cùng trong biểu đồ ngang

    return {
      count: results.length,
      avg: avg.toFixed(1),
      max,
      min,
      avgDurationSec,
      buckets,
      trend,
      passFail,
      hardestQuestions,
    };
  }, [results]);

  const periodSelector = (
    <div style={{ marginBottom: 20 }}>
      <label
        htmlFor="period-select"
        style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--text-dim)" }}
      >
        Xem dashboard của
      </label>
      <select
        id="period-select"
        className="field"
        style={{ maxWidth: 260 }}
        value={selectedPeriod}
        onChange={(e) => setSelectedPeriod(e.target.value)}
      >
        <option value={getCurrentPeriod()}>
          {formatPeriodLabel(getCurrentPeriod())} (tháng hiện tại)
        </option>
        {availablePeriods
          .filter((p) => p !== getCurrentPeriod())
          .map((p) => (
            <option key={p} value={p}>
              {p === "khong-ro" ? "Không rõ tháng (dữ liệu cũ)" : formatPeriodLabel(p)}
            </option>
          ))}
        <option value="all">Tất cả các tháng</option>
      </select>
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
    <div className="card" style={{ maxWidth: 1000 }}>
      <div className="eyebrow">Dashboard</div>
      <h1>Thống kê trực quan</h1>
      {periodSelector}

      {!charts ? (
        <p>Chưa có ai làm bài trong khoảng này cả. Thử chọn tháng khác ở trên.</p>
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
            <StatBox label="Điểm TB" value={`${charts.avg}%`} />
            <StatBox label="Cao nhất" value={`${charts.max}%`} />
            <StatBox label="Thấp nhất" value={`${charts.min}%`} />
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

          <ChartBlock title="Phân bố điểm số">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26333f" />
                <XAxis dataKey="range" tick={{ fill: DIM, fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: DIM, fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: "#0d1620", border: "1px solid #26333f", color: "#eef2f5" }}
                />
                <Bar
                  dataKey="Số người"
                  fill={ACCENT}
                  radius={[6, 6, 0, 0]}
                  animationDuration={700}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartBlock>

          <ChartBlock title="Xu hướng điểm theo từng lượt nộp bài">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={charts.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26333f" />
                <XAxis
                  dataKey="lan"
                  tick={{ fill: DIM, fontSize: 12 }}
                  label={{ value: "Lượt nộp bài", position: "insideBottom", offset: -5, fill: DIM }}
                />
                <YAxis domain={[0, 100]} tick={{ fill: DIM, fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: "#0d1620", border: "1px solid #26333f", color: "#eef2f5" }}
                  formatter={(value, name, props) => [`${value}%`, props.payload.ten]}
                />
                <Line
                  type="monotone"
                  dataKey="Điểm %"
                  stroke={ACCENT}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartBlock>

          <ChartBlock title="Tỷ lệ đạt / chưa đạt (ngưỡng 50%)">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={charts.passFail}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  animationDuration={700}
                  animationEasing="ease-out"
                >
                  <Cell fill={OK} />
                  <Cell fill={WRONG} />
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0d1620", border: "1px solid #26333f", color: "#eef2f5" }}
                />
                <Legend wrapperStyle={{ color: DIM, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartBlock>

          {charts.hardestQuestions.length > 0 && (
            <ChartBlock title="Top 10 câu hỏi hay bị sai nhất">
              <ResponsiveContainer width="100%" height={Math.max(260, charts.hardestQuestions.length * 34)}>
                <BarChart data={charts.hardestQuestions} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26333f" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: DIM, fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="question"
                    width={220}
                    tick={{ fill: DIM, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ background: "#0d1620", border: "1px solid #26333f", color: "#eef2f5" }}
                  />
                  <Bar
                    dataKey="Tỷ lệ sai %"
                    fill={WRONG}
                    radius={[0, 6, 6, 0]}
                    animationDuration={700}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartBlock>
          )}
        </div>
      )}

      <div className="link-row" style={{ marginTop: 24 }}>
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
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 17, marginBottom: 12 }}>{title}</h2>
      {children}
    </div>
  );
}

function StatBox({ label, value }) {
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
      <div style={{ fontSize: 20, fontFamily: "var(--font-mono)", color: "var(--amber)" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}
