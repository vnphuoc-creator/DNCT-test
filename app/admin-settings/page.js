"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getSettings, updateSetting } from "../../lib/settings";
import { getQuizWindowStatus, formatWindowMessage, DEFAULT_OPEN_DAY, DEFAULT_CLOSE_DAY } from "../../lib/quizWindow";
import { getCurrentPeriod, formatPeriodLabel } from "../../lib/period";

const DEFAULT_QUESTIONS_PER_QUIZ = 25;
const DEFAULT_PASS_THRESHOLD = 80;

export default function AdminSettingsPage() {
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [savingKey, setSavingKey] = useState(null);
  const [savedFlash, setSavedFlash] = useState(null);

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [openDay, setOpenDay] = useState(DEFAULT_OPEN_DAY);
  const [closeDay, setCloseDay] = useState(DEFAULT_CLOSE_DAY);
  const [questionsCount, setQuestionsCount] = useState(DEFAULT_QUESTIONS_PER_QUIZ);
  const [passThreshold, setPassThreshold] = useState(DEFAULT_PASS_THRESHOLD);

  const [windowStatus, setWindowStatus] = useState(null);

  // Vùng nguy hiểm — xoá kết quả theo kỳ
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());
  const [periodCount, setPeriodCount] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setStatus("loading");
    try {
      const settings = await getSettings();
      setOverrideOpen(settings.quiz_override_open === "true");
      setOpenDay(parseInt(settings.quiz_open_day, 10) || DEFAULT_OPEN_DAY);
      setCloseDay(parseInt(settings.quiz_close_day, 10) || DEFAULT_CLOSE_DAY);
      setQuestionsCount(parseInt(settings.quiz_questions_count, 10) || DEFAULT_QUESTIONS_PER_QUIZ);
      setPassThreshold(parseInt(settings.quiz_pass_threshold, 10) || DEFAULT_PASS_THRESHOLD);

      setWindowStatus(await getQuizWindowStatus());

      const { data: resultRows } = await supabase.from("quiz_results").select("period");
      const uniquePeriods = Array.from(
        new Set((resultRows || []).map((r) => r.period || "khong-ro"))
      ).sort()
        .reverse();
      setPeriods(uniquePeriods);

      setStatus("ready");
    } catch (err) {
      setErrorMsg(String(err));
      setStatus("error");
    }
  }

  useEffect(() => {
    if (status !== "ready") return;
    (async () => {
      const { count } = await supabase
        .from("quiz_results")
        .select("id", { count: "exact", head: true })
        .eq("period", selectedPeriod);
      setPeriodCount(count ?? 0);
    })();
  }, [selectedPeriod, status]);

  async function saveField(key, value, onDone) {
    setSavingKey(key);
    const { error } = await updateSetting(key, value);
    setSavingKey(null);
    if (error) {
      alert("Lưu thất bại: " + error.message);
      return;
    }
    if (onDone) onDone();
    setSavedFlash(key);
    setWindowStatus(await getQuizWindowStatus());
    setTimeout(() => setSavedFlash(null), 1800);
  }

  async function handleToggleOverride() {
    const next = !overrideOpen;
    setOverrideOpen(next);
    await saveField("quiz_override_open", next ? "true" : "false");
  }

  async function handleSaveDays(e) {
    e.preventDefault();
    await updateSetting("quiz_open_day", openDay);
    await saveField("quiz_close_day", closeDay);
  }

  async function handleSaveQuizConfig(e) {
    e.preventDefault();
    await updateSetting("quiz_questions_count", questionsCount);
    await saveField("quiz_pass_threshold", passThreshold);
  }

  async function handleDeletePeriod() {
    if (confirmText.trim() !== selectedPeriod) {
      alert(`Gõ đúng "${selectedPeriod}" vào ô xác nhận trước khi xoá.`);
      return;
    }
    setDeleting(true);
    const { error } = await supabase.from("quiz_results").delete().eq("period", selectedPeriod);
    setDeleting(false);
    if (error) {
      alert("Xoá thất bại: " + error.message);
      return;
    }
    setConfirmText("");
    alert(`Đã xoá toàn bộ kết quả của kỳ ${selectedPeriod}.`);
    loadAll();
  }

  async function handleLogout() {
    await fetch("/api/admin-logout", { method: "POST" });
    window.location.href = "/";
  }

  if (status === "loading") {
    return (
      <div className="card">
        <p>Đang tải cài đặt...</p>
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
    <div className="card" style={{ maxWidth: 720 }}>
      <div className="eyebrow">Cài đặt hệ thống</div>
      <h1>Cấu hình bài test</h1>
      <p>Các thay đổi ở đây có hiệu lực ngay lập tức, không cần deploy lại.</p>

      {windowStatus && (
        <div
          className="error-box"
          style={{
            background: windowStatus.open ? "var(--ok-glow)" : "var(--amber-glow)",
            border: `1px solid ${windowStatus.open ? "var(--ok)" : "var(--amber-dim)"}`,
            color: "var(--text)",
          }}
        >
          <strong>{windowStatus.open ? "🟢 Đang MỞ" : "🔒 Đang KHOÁ"}</strong> — {formatWindowMessage(windowStatus)}
        </div>
      )}

      {/* ---- Ghi đè khẩn cấp ---- */}
      <SectionTitle>Cho phép làm bài sớm (bỏ qua lịch)</SectionTitle>
      <p style={{ marginTop: -8 }}>
        Bật cờ này để mở bài test ngay lập tức, bất kể đang trong hay ngoài khung ngày {openDay}–{closeDay}.
        Dùng khi cần cho một số người làm thử/làm bù trước lịch chính thức. Nhớ tắt lại sau khi xong.
      </p>
      <label className="toggle-row">
        <input type="checkbox" checked={overrideOpen} onChange={handleToggleOverride} />
        <span>{overrideOpen ? "Đang BẬT — bài test mở bất kể lịch" : "Đang TẮT — theo đúng lịch ngày " + openDay + "–" + closeDay}</span>
        {savingKey === "quiz_override_open" && <span className="saving-dot">Đang lưu...</span>}
        {savedFlash === "quiz_override_open" && <span className="saved-flash">✓ Đã lưu</span>}
      </label>

      {/* ---- Lịch mở bài test ---- */}
      <SectionTitle>Lịch mở bài test hằng tháng</SectionTitle>
      <form onSubmit={handleSaveDays}>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <label>Ngày mở (1–31)</label>
            <input
              className="field"
              type="number"
              min={1}
              max={31}
              value={openDay}
              onChange={(e) => setOpenDay(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Ngày đóng (1–31)</label>
            <input
              className="field"
              type="number"
              min={1}
              max={31}
              value={closeDay}
              onChange={(e) => setCloseDay(e.target.value)}
            />
          </div>
        </div>
        <button className="btn-primary" type="submit" disabled={savingKey === "quiz_close_day"}>
          {savingKey === "quiz_close_day" ? "Đang lưu..." : "Lưu lịch mở bài"}
        </button>
        {savedFlash === "quiz_close_day" && <span className="saved-flash" style={{ marginLeft: 10 }}>✓ Đã lưu</span>}
      </form>

      {/* ---- Cấu hình bài thi ---- */}
      <SectionTitle>Cấu hình bài thi</SectionTitle>
      <form onSubmit={handleSaveQuizConfig}>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <label>Số câu hỏi mỗi lượt thi</label>
            <input
              className="field"
              type="number"
              min={5}
              max={200}
              value={questionsCount}
              onChange={(e) => setQuestionsCount(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Ngưỡng điểm ĐẠT để hiện lời chúc mừng (%)</label>
            <input
              className="field"
              type="number"
              min={0}
              max={100}
              value={passThreshold}
              onChange={(e) => setPassThreshold(e.target.value)}
            />
          </div>
        </div>
        <button className="btn-primary" type="submit" disabled={savingKey === "quiz_pass_threshold"}>
          {savingKey === "quiz_pass_threshold" ? "Đang lưu..." : "Lưu cấu hình bài thi"}
        </button>
        {savedFlash === "quiz_pass_threshold" && <span className="saved-flash" style={{ marginLeft: 10 }}>✓ Đã lưu</span>}
      </form>

      {/* ---- Vùng nguy hiểm ---- */}
      <SectionTitle danger>Vùng nguy hiểm — Xoá kết quả theo kỳ</SectionTitle>
      <p style={{ marginTop: -8 }}>
        Dùng khi cần xoá các lượt làm bài thử/làm sớm (ví dụ sau khi bật &quot;Cho phép làm bài
        sớm&quot; ở trên) trước khi kỳ thi chính thức mở.{" "}
        <strong>Xoá xong không khôi phục lại được.</strong>
      </p>
      <label>Chọn kỳ cần xoá</label>
      <select
        className="field"
        value={selectedPeriod}
        onChange={(e) => {
          setSelectedPeriod(e.target.value);
          setConfirmText("");
        }}
      >
        <option value={getCurrentPeriod()}>{formatPeriodLabel(getCurrentPeriod())} (kỳ hiện tại)</option>
        {periods
          .filter((p) => p !== getCurrentPeriod())
          .map((p) => (
            <option key={p} value={p}>
              {p === "khong-ro" ? "Không rõ kỳ (dữ liệu cũ)" : formatPeriodLabel(p)}
            </option>
          ))}
      </select>

      <div className="danger-zone">
        <p style={{ margin: "0 0 10px" }}>
          Kỳ <strong>{selectedPeriod}</strong> hiện có{" "}
          <strong>{periodCount === null ? "..." : periodCount}</strong> lượt làm bài.
        </p>
        {periodCount > 0 && (
          <>
            <label>
              Gõ chính xác <code>{selectedPeriod}</code> để xác nhận xoá
            </label>
            <input
              className="field"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={selectedPeriod}
            />
            <button
              className="btn-danger"
              onClick={handleDeletePeriod}
              disabled={deleting || confirmText.trim() !== selectedPeriod}
            >
              {deleting ? "Đang xoá..." : `Xoá toàn bộ ${periodCount} kết quả của kỳ này`}
            </button>
          </>
        )}
      </div>

      <div className="link-row" style={{ marginTop: 28 }}>
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

function SectionTitle({ children, danger }) {
  return (
    <h2
      style={{
        marginTop: 32,
        paddingTop: 20,
        borderTop: "1px solid var(--panel-border)",
        color: danger ? "var(--danger)" : undefined,
      }}
    >
      {children}
    </h2>
  );
}
