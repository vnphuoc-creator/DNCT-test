"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getSettings, updateSetting } from "../../lib/settings";
import {
  getQuizWindowStatus,
  formatWindowMessage,
  DEFAULT_OPEN_DAY,
  DEFAULT_CLOSE_DAY,
  DEFAULT_OPEN_TIME,
  DEFAULT_CLOSE_TIME,
} from "../../lib/quizWindow";
import { getCurrentPeriod, formatPeriodLabel } from "../../lib/period";
import { FIXED_CATEGORIES } from "../../lib/categories";
import {
  listQuestionSets,
  getQuestionSetWithQuestions,
  regenerateQuestionSets,
  QUESTION_SETS_COUNT,
  QUESTIONS_PER_SET,
} from "../../lib/questionSets";

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
  const [openTime, setOpenTime] = useState(DEFAULT_OPEN_TIME);
  const [closeTime, setCloseTime] = useState(DEFAULT_CLOSE_TIME);
  const [questionsCount, setQuestionsCount] = useState(DEFAULT_QUESTIONS_PER_QUIZ);
  const [passThreshold, setPassThreshold] = useState(DEFAULT_PASS_THRESHOLD);

  const [windowStatus, setWindowStatus] = useState(null);

  // Chế độ ra đề: random riêng cho từng người, hoặc dùng 1 bộ đề cố định cho tất cả
  const [quizMode, setQuizMode] = useState("random"); // random | fixed_set
  const [activeSetId, setActiveSetId] = useState("");
  const [questionSets, setQuestionSets] = useState([]);
  const [generatingSets, setGeneratingSets] = useState(false);
  const [setsError, setSetsError] = useState("");
  const [previewSetId, setPreviewSetId] = useState(null);
  const [previewSet, setPreviewSet] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Nhập bộ đề từ file PDF/Word
  const [importSetName, setImportSetName] = useState("");
  const [importSetCategory, setImportSetCategory] = useState("");
  const [importSetFile, setImportSetFile] = useState(null);
  const [importSetQuestions, setImportSetQuestions] = useState([]);
  const [analyzingSet, setAnalyzingSet] = useState(false);
  const [savingImportSet, setSavingImportSet] = useState(false);
  const [importSetError, setImportSetError] = useState("");

  // Vùng nguy hiểm — xoá kết quả theo kỳ
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());
  const [periodCount, setPeriodCount] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // Vùng nguy hiểm — xoá bài test của 1 nhân viên, cho làm lại
  const [allUsers, setAllUsers] = useState([]);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeePeriod, setEmployeePeriod] = useState(getCurrentPeriod());
  const [employeeResult, setEmployeeResult] = useState(undefined); // undefined = chưa tra, null = không có
  const [checkingEmployeeResult, setCheckingEmployeeResult] = useState(false);
  const [deletingEmployeeResult, setDeletingEmployeeResult] = useState(false);

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
      setOpenTime(settings.quiz_open_time || DEFAULT_OPEN_TIME);
      setCloseTime(settings.quiz_close_time || DEFAULT_CLOSE_TIME);
      setQuestionsCount(parseInt(settings.quiz_questions_count, 10) || DEFAULT_QUESTIONS_PER_QUIZ);
      setPassThreshold(parseInt(settings.quiz_pass_threshold, 10) || DEFAULT_PASS_THRESHOLD);
      setQuizMode(settings.quiz_mode === "fixed_set" ? "fixed_set" : "random");
      setActiveSetId(settings.quiz_active_set_id || "");

      setWindowStatus(await getQuizWindowStatus());

      const { data: resultRows } = await supabase.from("quiz_results").select("period");
      const uniquePeriods = Array.from(
        new Set((resultRows || []).map((r) => r.period || "khong-ro"))
      ).sort()
        .reverse();
      setPeriods(uniquePeriods);

      const { data: usersRows } = await supabase
        .from("allowed_users")
        .select("id, full_name, email")
        .order("full_name", { ascending: true });
      setAllUsers(usersRows || []);

      try {
        setQuestionSets(await listQuestionSets());
      } catch (e) {
        // Bảng question_sets có thể chưa được tạo (chưa chạy SQL migration) — không làm sập trang
        setSetsError(String(e.message || e));
      }

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

  const employeeMatches = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    if (!q) return allUsers.slice(0, 8);
    return allUsers
      .filter((u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allUsers, employeeQuery]);

  useEffect(() => {
    if (!selectedEmployee) {
      setEmployeeResult(undefined);
      return;
    }
    (async () => {
      setCheckingEmployeeResult(true);
      const { data } = await supabase
        .from("quiz_results")
        .select("id, score, total, created_at")
        .ilike("email", selectedEmployee.email)
        .eq("period", employeePeriod)
        .order("created_at", { ascending: false })
        .limit(1);
      setEmployeeResult(data && data.length > 0 ? data[0] : null);
      setCheckingEmployeeResult(false);
    })();
  }, [selectedEmployee, employeePeriod]);

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
    await updateSetting("quiz_close_day", closeDay);
    await updateSetting("quiz_open_time", openTime);
    await saveField("quiz_close_time", closeTime);
  }

  async function handleSaveQuizConfig(e) {
    e.preventDefault();
    await updateSetting("quiz_questions_count", questionsCount);
    await saveField("quiz_pass_threshold", passThreshold);
  }

  async function handleSaveQuizMode(e) {
    e.preventDefault();
    if (quizMode === "fixed_set" && !activeSetId) {
      alert("Vui lòng chọn 1 bộ đề trước khi lưu.");
      return;
    }
    await updateSetting("quiz_mode", quizMode);
    await saveField("quiz_active_set_id", quizMode === "fixed_set" ? activeSetId : "");
  }

  async function handleGenerateSets() {
    const confirmed = window.confirm(
      questionSets.length > 0
        ? `Tạo lại ${QUESTION_SETS_COUNT} bộ đề sẽ thay thế các bộ đề tự tạo hiện có (bộ đề import từ file được giữ nguyên). Tiếp tục?`
        : `Tạo sẵn ${QUESTION_SETS_COUNT} bộ đề, mỗi bộ ${QUESTIONS_PER_SET} câu chia đều cho từng hệ thống?`
    );
    if (!confirmed) return;
    setGeneratingSets(true);
    setSetsError("");
    try {
      const sets = await regenerateQuestionSets();
      setQuestionSets(sets);
      // Nếu bộ đề đang chọn không còn tồn tại nữa, bỏ chọn
      if (activeSetId && !sets.some((s) => String(s.id) === String(activeSetId))) {
        setActiveSetId("");
      }
    } catch (e) {
      setSetsError(String(e.message || e));
    }
    setGeneratingSets(false);
  }

  async function handleAnalyzeSetFile(e) {
    e.preventDefault();
    setImportSetError("");
    if (!importSetName.trim()) {
      setImportSetError("Vui lòng đặt tên cho bộ đề.");
      return;
    }
    if (!importSetFile) {
      setImportSetError("Vui lòng chọn file PDF hoặc Word.");
      return;
    }
    setAnalyzingSet(true);
    try {
      const fd = new FormData();
      fd.append("file", importSetFile);
      const res = await fetch("/api/import-questions", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setImportSetError(data.message || "Phân tích file thất bại.");
      } else {
        setImportSetQuestions(
          data.questions.map((q) => ({ ...q, category: importSetCategory, include: !q.needsReview }))
        );
      }
    } catch (err) {
      setImportSetError("Lỗi khi gửi file: " + String(err.message || err));
    }
    setAnalyzingSet(false);
  }

  function updateImportSetQuestion(index, patch) {
    setImportSetQuestions((list) => list.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  async function handleConfirmImportSet() {
    const chosen = importSetQuestions.filter((q) => q.include);
    if (chosen.length === 0) {
      setImportSetError("Chưa có câu hỏi nào được chọn.");
      return;
    }
    const invalid = chosen.some(
      (q) =>
        !q.question_text.trim() ||
        q.options.filter((o) => o.trim()).length < 2 ||
        !q.options[q.correct_index]?.trim()
    );
    if (invalid) {
      setImportSetError("Có câu thiếu nội dung/đáp án đúng hợp lệ — hãy bỏ chọn hoặc sửa lại các câu ⚠️.");
      return;
    }
    setSavingImportSet(true);
    setImportSetError("");
    try {
      // Bộ đề lưu danh sách id câu hỏi, nên các câu được thêm vào Ngân hàng câu hỏi trước
      const { data: inserted, error: qErr } = await supabase
        .from("questions")
        .insert(
          chosen.map((q) => ({
            question_text: q.question_text.trim(),
            options: q.options.map((o) => o.trim()),
            correct_index: q.correct_index,
            category: q.category || null,
          }))
        )
        .select("id");
      if (qErr) throw qErr;

      const { error: sErr } = await supabase
        .from("question_sets")
        .insert({ name: importSetName.trim(), question_ids: inserted.map((r) => r.id) });
      if (sErr) throw sErr;

      setQuestionSets(await listQuestionSets());
      setImportSetQuestions([]);
      setImportSetFile(null);
      setImportSetName("");
      alert(`Đã nhập bộ đề "${importSetName.trim()}" gồm ${chosen.length} câu. Bạn có thể chọn nó ở phần "Chế độ ra đề".`);
    } catch (err) {
      setImportSetError("Lưu bộ đề thất bại: " + String(err.message || err));
    }
    setSavingImportSet(false);
  }

  async function handlePreviewSet(setId) {
    if (previewSetId === setId) {
      setPreviewSetId(null);
      setPreviewSet(null);
      return;
    }
    setPreviewSetId(setId);
    setPreviewSet(null);
    setPreviewLoading(true);
    try {
      const full = await getQuestionSetWithQuestions(setId);
      setPreviewSet(full);
    } catch (e) {
      setSetsError(String(e.message || e));
    }
    setPreviewLoading(false);
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

  function handlePickEmployee(user) {
    setSelectedEmployee(user);
    setEmployeeQuery(user.full_name);
    setShowEmployeeList(false);
  }

  async function handleDeleteEmployeeResult() {
    if (!selectedEmployee || !employeeResult) return;
    const confirmed = window.confirm(
      `Xoá bài test kỳ ${formatPeriodLabel(employeePeriod)} của "${selectedEmployee.full_name}" (đạt ${employeeResult.score}/${employeeResult.total})?\n\nSau khi xoá, người này sẽ làm lại được bài test kỳ này.`
    );
    if (!confirmed) return;
    setDeletingEmployeeResult(true);
    const { error } = await supabase.from("quiz_results").delete().eq("id", employeeResult.id);
    setDeletingEmployeeResult(false);
    if (error) {
      alert("Xoá thất bại: " + error.message);
      return;
    }
    alert(`Đã xoá bài test. ${selectedEmployee.full_name} có thể làm lại bài test kỳ này.`);
    setEmployeeResult(null);
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
        <p style={{ marginTop: -8, marginBottom: 8, fontSize: 13, color: "var(--text-dim)" }}>
          Khung giờ mở bài mỗi ngày trong đợt thi (mặc định 00:00–23:59 = mở cả ngày)
        </p>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <label>Giờ mở mỗi ngày</label>
            <input
              className="field"
              type="time"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Giờ đóng mỗi ngày</label>
            <input
              className="field"
              type="time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
            />
          </div>
        </div>
        <button className="btn-primary" type="submit" disabled={savingKey === "quiz_close_time"}>
          {savingKey === "quiz_close_time" ? "Đang lưu..." : "Lưu lịch mở bài"}
        </button>
        {savedFlash === "quiz_close_time" && <span className="saved-flash" style={{ marginLeft: 10 }}>✓ Đã lưu</span>}
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

      {/* ---- Chế độ ra đề & bộ đề cố định ---- */}
      <SectionTitle>Chế độ ra đề &amp; Bộ đề câu hỏi</SectionTitle>
      <p style={{ marginTop: -8 }}>
        Mặc định hệ thống bốc câu hỏi <strong>ngẫu nhiên riêng cho từng người</strong> (chia đều
        theo hệ thống). Bạn có thể chuyển sang dùng <strong>1 bộ đề cố định</strong> — mọi người
        làm chung đúng bộ câu hỏi đó — để dễ kiểm soát nội dung đề thi của cả đợt.
      </p>

      {setsError && <div className="error-box">{setsError}</div>}

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleGenerateSets}
          disabled={generatingSets}
        >
          {generatingSets
            ? "Đang tạo bộ đề..."
            : questionSets.length > 0
            ? `↻ Tạo lại ${QUESTION_SETS_COUNT} bộ đề`
            : `+ Tạo sẵn ${QUESTION_SETS_COUNT} bộ đề (mỗi bộ ${QUESTIONS_PER_SET} câu)`}
        </button>
        <span style={{ fontSize: 13, color: "var(--text-dim)", alignSelf: "center" }}>
          {questionSets.length > 0
            ? `Hiện có ${questionSets.length} bộ đề đã tạo sẵn.`
            : "Chưa có bộ đề nào — bấm nút để tạo."}
        </span>
      </div>

      <form onSubmit={handleSaveQuizMode}>
        <label className="toggle-row" style={{ cursor: "pointer" }}>
          <input
            type="radio"
            name="quiz_mode"
            checked={quizMode === "random"}
            onChange={() => setQuizMode("random")}
            style={{ width: 18, height: 18 }}
          />
          <span>Random riêng cho từng người (mặc định)</span>
        </label>
        <label className="toggle-row" style={{ cursor: "pointer" }}>
          <input
            type="radio"
            name="quiz_mode"
            checked={quizMode === "fixed_set"}
            onChange={() => setQuizMode("fixed_set")}
            disabled={questionSets.length === 0}
            style={{ width: 18, height: 18 }}
          />
          <span>
            Dùng 1 bộ đề cố định cho tất cả
            {questionSets.length === 0 && " (cần tạo bộ đề trước)"}
          </span>
        </label>

        {quizMode === "fixed_set" && questionSets.length > 0 && (
          <div style={{ marginTop: 4, marginBottom: 8 }}>
            <label>Chọn bộ đề sẽ gửi cho mọi người làm bài</label>
            <select
              className="field"
              value={activeSetId}
              onChange={(e) => setActiveSetId(e.target.value)}
            >
              <option value="">— Chưa chọn bộ đề —</option>
              {questionSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.count} câu)
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          className="btn-primary"
          type="submit"
          disabled={savingKey === "quiz_active_set_id"}
        >
          {savingKey === "quiz_active_set_id" ? "Đang lưu..." : "Lưu chế độ ra đề"}
        </button>
        {savedFlash === "quiz_active_set_id" && (
          <span className="saved-flash" style={{ marginLeft: 10 }}>✓ Đã lưu</span>
        )}
      </form>

      {questionSets.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <label>Xem trước nội dung từng bộ đề (chỉ admin xem được)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {questionSets.map((s) => (
              <div
                key={s.id}
                style={{
                  border: "1px solid var(--panel-border)",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => handlePreviewSet(s.id)}
                >
                  <strong>
                    {s.name} <span style={{ fontWeight: 400, color: "var(--text-dim)" }}>({s.count} câu)</span>
                    {String(s.id) === String(activeSetId) && quizMode === "fixed_set" && (
                      <span className="saved-flash" style={{ marginLeft: 8 }}>● đang chọn</span>
                    )}
                  </strong>
                  <span style={{ fontSize: 13, color: "var(--brand-cyan)" }}>
                    {previewSetId === s.id ? "Ẩn nội dung ▲" : "Xem nội dung ▼"}
                  </span>
                </div>

                {previewSetId === s.id && (
                  <div style={{ marginTop: 10, borderTop: "1px solid var(--panel-border)", paddingTop: 10 }}>
                    {previewLoading && <p>Đang tải nội dung bộ đề...</p>}
                    {!previewLoading && previewSet && (
                      <ol style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                        {previewSet.questions.map((q) => (
                          <li key={q.id} style={{ fontSize: 13.5 }}>
                            <div>
                              {q.question_text}{" "}
                              <span style={{ color: "var(--text-dim)" }}>[{q.category || "Khác"}]</span>
                            </div>
                            <ul style={{ paddingLeft: 18, margin: "4px 0 0" }}>
                              {(q.options || []).map((opt, i) => (
                                <li
                                  key={i}
                                  style={{
                                    color: i === q.correct_index ? "var(--ok)" : "var(--text-dim)",
                                    fontWeight: i === q.correct_index ? 700 : 400,
                                  }}
                                >
                                  {String.fromCharCode(65 + i)}. {opt}
                                  {i === q.correct_index ? " ✓" : ""}
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Nhập bộ đề từ file ---- */}
      <SectionTitle>Nhập bộ đề từ file PDF / Word</SectionTitle>
      <p style={{ marginTop: -8 }}>
        Tải lên file đề (định dạng <code>Câu 1: ...</code>, <code>A. ...</code>, <code>Đáp án đúng: B</code>).
        Sau khi xem lại, các câu được thêm vào Ngân hàng câu hỏi và gom thành 1 bộ đề mới để chọn làm đề thi.
      </p>
      {importSetError && <div className="error-box">{importSetError}</div>}

      {importSetQuestions.length === 0 ? (
        <form onSubmit={handleAnalyzeSetFile}>
          <label>Tên bộ đề</label>
          <input
            className="field"
            type="text"
            placeholder="VD: Đề tháng 10"
            value={importSetName}
            onChange={(e) => setImportSetName(e.target.value)}
          />
          <label>Hệ mặc định cho các câu trong file (có thể đổi từng câu sau)</label>
          <select
            className="field"
            value={importSetCategory}
            onChange={(e) => setImportSetCategory(e.target.value)}
          >
            <option value="">— Chưa chọn hệ —</option>
            {FIXED_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label>Chọn file (.pdf, .doc, .docx)</label>
          <input
            className="field"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setImportSetFile(e.target.files?.[0] || null)}
          />
          <button className="btn-primary" type="submit" disabled={analyzingSet}>
            {analyzingSet ? "Đang phân tích..." : "Phân tích file"}
          </button>
        </form>
      ) : (
        <>
          <p>
            Nhận diện được <strong>{importSetQuestions.length}</strong> câu cho bộ đề{" "}
            <strong>{importSetName}</strong>. Câu đánh dấu ⚠️ cần xem lại.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 460, overflowY: "auto" }}>
            {importSetQuestions.map((q, i) => (
              <div
                key={i}
                style={{
                  border: `1px solid ${q.needsReview ? "var(--danger)" : "var(--panel-border)"}`,
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 13.5,
                }}
              >
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={q.include}
                    onChange={(e) => updateImportSetQuestion(i, { include: e.target.checked })}
                    style={{ width: 16, height: 16, marginTop: 3 }}
                  />
                  <span>
                    {q.needsReview && <span style={{ color: "var(--danger)" }}>⚠️ {q.warning} </span>}
                    <strong>{i + 1}. {q.question_text}</strong>
                  </span>
                </label>
                {q.options.map((opt, oi) => (
                  <label key={oi} style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: 24, marginTop: 4 }}>
                    <input
                      type="radio"
                      name={`set-correct-${i}`}
                      checked={q.correct_index === oi}
                      onChange={() => updateImportSetQuestion(i, { correct_index: oi })}
                    />
                    <span style={{ color: q.correct_index === oi ? "var(--ok)" : "var(--text-dim)" }}>
                      {String.fromCharCode(65 + oi)}. {opt}
                    </span>
                  </label>
                ))}
                <select
                  className="field"
                  style={{ marginTop: 8 }}
                  value={q.category || ""}
                  onChange={(e) => updateImportSetQuestion(i, { category: e.target.value })}
                >
                  <option value="">— Chưa chọn hệ —</option>
                  {FIXED_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="link-row" style={{ marginTop: 14 }}>
            <button className="btn-primary" onClick={handleConfirmImportSet} disabled={savingImportSet}>
              {savingImportSet
                ? "Đang lưu..."
                : `Tạo bộ đề từ ${importSetQuestions.filter((q) => q.include).length} câu`}
            </button>
            <button
              className="btn-secondary"
              onClick={() => { setImportSetQuestions([]); setImportSetFile(null); }}
              disabled={savingImportSet}
            >
              ← Chọn file khác
            </button>
          </div>
        </>
      )}

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

      {/* ---- Vùng nguy hiểm: xoá bài của 1 nhân viên ---- */}
      <SectionTitle danger>Vùng nguy hiểm — Xoá bài test của 1 nhân viên (cho làm lại)</SectionTitle>
      <p style={{ marginTop: -8 }}>
        Dùng khi 1 nhân viên cụ thể làm bài bị lỗi/nhầm và cần làm lại. Chỉ xoá đúng kết quả của
        người và kỳ được chọn, không ảnh hưởng người khác.
      </p>

      <label>Tìm nhân viên (theo tên hoặc email)</label>
      <div className="combobox">
        <input
          className="field"
          type="text"
          autoComplete="off"
          placeholder="Nhập họ tên hoặc email..."
          value={employeeQuery}
          onChange={(e) => {
            setEmployeeQuery(e.target.value);
            setSelectedEmployee(null);
            setShowEmployeeList(true);
          }}
          onFocus={() => setShowEmployeeList(true)}
        />
        {showEmployeeList && employeeQuery.trim() && employeeMatches.length > 0 && (
          <div className="combobox-list">
            {employeeMatches.map((u) => (
              <div key={u.id} className="combobox-item" onClick={() => handlePickEmployee(u)}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <strong style={{ fontSize: 14, color: "#ffffff" }}>{u.full_name}</strong>
                </div>
                <span className="email">{u.email}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedEmployee && (
        <div className="danger-zone" style={{ marginTop: 10 }}>
          <p style={{ margin: "0 0 10px" }}>
            Đang chọn: <strong>{selectedEmployee.full_name}</strong> ({selectedEmployee.email})
          </p>
          <label>Kỳ cần xoá</label>
          <select
            className="field"
            value={employeePeriod}
            onChange={(e) => setEmployeePeriod(e.target.value)}
          >
            <option value={getCurrentPeriod()}>{formatPeriodLabel(getCurrentPeriod())} (kỳ hiện tại)</option>
            {periods
              .filter((p) => p !== getCurrentPeriod() && p !== "khong-ro")
              .map((p) => (
                <option key={p} value={p}>
                  {formatPeriodLabel(p)}
                </option>
              ))}
          </select>

          {checkingEmployeeResult && <p>Đang kiểm tra...</p>}
          {!checkingEmployeeResult && employeeResult === null && (
            <p style={{ color: "var(--text-dim)" }}>
              Người này chưa làm bài của kỳ {formatPeriodLabel(employeePeriod)} — không có gì để xoá.
            </p>
          )}
          {!checkingEmployeeResult && employeeResult && (
            <>
              <p>
                Đã làm bài kỳ {formatPeriodLabel(employeePeriod)}, đạt{" "}
                <strong>
                  {employeeResult.score}/{employeeResult.total}
                </strong>{" "}
                điểm.
              </p>
              <button
                className="btn-danger"
                onClick={handleDeleteEmployeeResult}
                disabled={deletingEmployeeResult}
              >
                {deletingEmployeeResult ? "Đang xoá..." : "Xoá bài test này & cho phép làm lại"}
              </button>
            </>
          )}
        </div>
      )}

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
