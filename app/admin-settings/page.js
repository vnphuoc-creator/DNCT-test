"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getSettings, updateSetting } from "../../lib/settings";
import { getQuizWindowStatus, formatWindowMessage, DEFAULT_OPEN_DAY, DEFAULT_CLOSE_DAY } from "../../lib/quizWindow";
import { getCurrentPeriod, formatPeriodLabel } from "../../lib/period";
import { FIXED_CATEGORIES } from "../../lib/categories";

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
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("17:00");
  const [quizMode, setQuizMode] = useState("random");
  const [activeSetId, setActiveSetId] = useState("");
  const [quizSets, setQuizSets] = useState([]);
  const [setQuestions, setSetQuestions] = useState({});
  const [setsLoading, setSetsLoading] = useState(false);
  const [generatingSets, setGeneratingSets] = useState(false);

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
      setOpenTime(settings.quiz_open_time || "08:00");
      setCloseTime(settings.quiz_close_time || "17:00");
      setQuizMode(settings.quiz_mode || "random");
      setActiveSetId(settings.quiz_active_set_id || "");
      await loadQuizSets();

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

  async function loadQuizSets() {
    setSetsLoading(true);
    const { data, error } = await supabase.from("quiz_sets").select("*").order("id", { ascending: true });
    if (!error) {
      setQuizSets(data || []);
      const ids = (data || []).map((x) => x.id);
      if (ids.length) {
        const { data: rows } = await supabase
          .from("quiz_set_questions")
          .select("set_id, position, questions(*)")
          .in("set_id", ids)
          .order("position", { ascending: true });
        const grouped = {};
        for (const row of rows || []) {
          if (!grouped[row.set_id]) grouped[row.set_id] = [];
          if (row.questions) grouped[row.set_id].push(row.questions);
        }
        setSetQuestions(grouped);
      } else {
        setSetQuestions({});
      }
    }
    setSetsLoading(false);
  }

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickBalanced(allQuestions, count = 25, seedOffset = 0) {
    const groups = {};
    for (const q of allQuestions) {
      const key = q.category || "Khác";
      (groups[key] ||= []).push(q);
    }
    const keys = shuffleArray(Object.keys(groups));
    const pools = keys.map((k) => shuffleArray(groups[k]));
    const picked = [];
    let round = 0;
    while (picked.length < count) {
      let added = false;
      for (const pool of pools) {
        if (picked.length >= count) break;
        if (pool[round]) {
          picked.push(pool[round]);
          added = true;
        }
      }
      if (!added) break;
      round++;
    }
    return shuffleArray(picked).slice(0, count);
  }

  async function generateTenSets() {
    if (generatingSets) return;
    setGeneratingSets(true);
    try {
      const { data: allQuestions, error: qError } = await supabase.from("questions").select("*");
      if (qError) throw qError;
      if (!allQuestions || allQuestions.length < 25) throw new Error("Ngân hàng phải có ít nhất 25 câu hỏi.");
      const grouped = {};
      for (const q of allQuestions) (grouped[q.category || "Khác"] ||= []).push(q);
      if (Object.keys(grouped).length < 2) throw new Error("Cần ít nhất 2 hệ thống/chủ đề để chia đề cân bằng.");

      // Tạo lại đúng 10 bộ đề; mỗi bộ 25 câu, chia đều nhất có thể giữa các hệ có câu hỏi.
      const { data: oldSets } = await supabase.from("quiz_sets").select("id");
      if (oldSets?.length) {
        const ids = oldSets.map((x) => x.id);
        await supabase.from("quiz_set_questions").delete().in("set_id", ids);
        await supabase.from("quiz_sets").delete().in("id", ids);
      }

      for (let i = 1; i <= 10; i++) {
        const picked = pickBalanced(allQuestions, 25, i);
        if (picked.length < 25) throw new Error(`Không đủ câu hỏi để tạo Bộ đề ${i}.`);
        const { data: setRow, error: setError } = await supabase
          .from("quiz_sets")
          .insert({ name: `Bộ đề ${String(i).padStart(2, "0")}`, description: "25 câu — chia đều nhất có thể theo các hệ thống" })
          .select()
          .single();
        if (setError) throw setError;
        const rows = picked.map((q, idx) => ({ set_id: setRow.id, question_id: q.id, position: idx + 1 }));
        const { error: rowError } = await supabase.from("quiz_set_questions").insert(rows);
        if (rowError) throw rowError;
      }
      alert("Đã tạo xong 10 bộ đề, mỗi bộ 25 câu.");
      await loadQuizSets();
    } catch (err) {
      alert("Không tạo được bộ đề: " + (err.message || err));
    } finally {
      setGeneratingSets(false);
    }
  }

  async function saveQuizMode(e) {
    e.preventDefault();
    if (quizMode === "fixed" && !activeSetId) {
      alert("Hãy chọn một bộ đề trước khi chọn chế độ Bộ đề cố định.");
      return;
    }
    await updateSetting("quiz_mode", quizMode);
    await saveField("quiz_active_set_id", quizMode === "fixed" ? activeSetId : "");
  }

  async function saveSchedule(e) {
    e.preventDefault();
    if (!/^\d{2}:\d{2}$/.test(openTime) || !/^\d{2}:\d{2}$/.test(closeTime)) {
      alert("Giờ phải có dạng HH:MM.");
      return;
    }
    if (Number(openDay) > Number(closeDay) || (Number(openDay) === Number(closeDay) && openTime >= closeTime)) {
      alert("Lịch không hợp lệ: ngày/giờ đóng phải sau ngày/giờ mở.");
      return;
    }
    await updateSetting("quiz_open_day", openDay);
    await updateSetting("quiz_open_time", openTime);
    await updateSetting("quiz_close_day", closeDay);
    await saveField("quiz_close_time", closeTime);
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
    return saveSchedule(e);
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          <div><label>Ngày mở (1–31)</label><input className="field" type="number" min={1} max={31} value={openDay} onChange={(e) => setOpenDay(e.target.value)} /></div>
          <div><label>Giờ mở (giờ Việt Nam)</label><input className="field" type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} /></div>
          <div><label>Ngày đóng (1–31)</label><input className="field" type="number" min={1} max={31} value={closeDay} onChange={(e) => setCloseDay(e.target.value)} /></div>
          <div><label>Giờ đóng (giờ Việt Nam)</label><input className="field" type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} /></div>
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

      <SectionTitle>Chế độ phát đề & 10 bộ đề cố định</SectionTitle>
      <p style={{ marginTop: -8 }}>Chọn <strong>Ngẫu nhiên</strong> để hệ thống tự bốc câu cân bằng theo hệ, hoặc chọn <strong>Bộ đề cố định</strong> để mọi người tham gia làm cùng một bộ đề đã chuẩn bị.</p>
      <form onSubmit={saveQuizMode}>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 12 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="radio" checked={quizMode === "random"} onChange={() => setQuizMode("random")} /> Ngẫu nhiên theo hệ
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="radio" checked={quizMode === "fixed"} onChange={() => setQuizMode("fixed")} /> Bộ đề cố định
          </label>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <button type="button" className="btn-secondary" onClick={generateTenSets} disabled={generatingSets}>
            {generatingSets ? "Đang tạo 10 bộ..." : "⚙ Tạo lại 10 bộ đề"}
          </button>
          {setsLoading && <span className="saving-dot">Đang tải bộ đề...</span>}
        </div>
        {quizSets.length > 0 && (
          <div style={{ display: "grid", gap: 10 }}>
            {quizSets.map((set) => (
              <div key={set.id} style={{ border: "1px solid var(--panel-border)", borderRadius: 10, padding: 12, background: "rgba(255,255,255,.02)" }}>
                <label style={{ display: "flex", gap: 10, alignItems: "center", margin: 0 }}>
                  <input type="radio" name="quizSet" checked={String(activeSetId) === String(set.id)} onChange={() => setActiveSetId(String(set.id))} />
                  <strong>{set.name}</strong>
                  <span style={{ color: "var(--text-dim)", fontSize: 12 }}>{(setQuestions[set.id] || []).length}/25 câu</span>
                </label>
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", color: "var(--brand-cyan)" }}>Admin xem nội dung bộ đề</summary>
                  <ol style={{ marginTop: 8, paddingLeft: 24 }}>
                    {(setQuestions[set.id] || []).map((q) => (
                      <li key={q.id} style={{ marginBottom: 8 }}>
                        <div><strong>{q.question_text}</strong></div>
                        <div style={{ color: "var(--text-dim)", fontSize: 12 }}>Hệ: {q.category || "Khác"} · Đáp án đúng: {String.fromCharCode(65 + q.correct_index)}</div>
                      </li>
                    ))}
                  </ol>
                </details>
              </div>
            ))}
          </div>
        )}
        <button className="btn-primary" type="submit" style={{ marginTop: 14 }}>Lưu chế độ phát đề</button>
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
