"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Settings,
  Clock,
  Calendar,
  Layers,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  ShieldAlert,
  Search,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  DEFAULT_SETTINGS,
  getLocalSettings,
  saveServerSettings,
  fetchServerSettings,
  checkQuizScheduleStatus,
} from "../../lib/settings";
import {
  DEFAULT_EXAM_SETS,
  getLocalExamSets,
} from "../../lib/examSets";
import { getCurrentPeriod, formatPeriodLabel } from "../../lib/period";
import { supabase } from "../../lib/supabaseClient";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("schedule"); // schedule | exam_sets | delete_results
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [examSets, setExamSets] = useState(DEFAULT_EXAM_SETS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [previewSchedule, setPreviewSchedule] = useState(null);

  // State cho Tab Xóa kết quả
  const [allResults, setAllResults] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());
  const [searchPerson, setSearchPerson] = useState("");
  const [deletePeriodConfirmModal, setDeletePeriodConfirmModal] = useState(false);
  const [deleteInputText, setDeleteInputText] = useState("");
  const [deletingPeriod, setDeletingPeriod] = useState(false);
  const [resetSingleTarget, setResetSingleTarget] = useState(null);
  const [resettingSingle, setResettingSingle] = useState(false);

  // State cho Modal tạo bộ đề mới
  const [showCreateSetModal, setShowCreateSetModal] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newSetDesc, setNewSetDesc] = useState("");
  const [creatingSet, setCreatingSet] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    // 1. Tải settings
    const serverCfg = await fetchServerSettings();
    setSettings(serverCfg);
    setPreviewSchedule(checkQuizScheduleStatus(serverCfg));

    // 2. Tải exam sets
    try {
      const setsRes = await fetch("/api/exam-sets");
      if (setsRes.ok) {
        const data = await setsRes.json();
        if (data.sets && data.sets.length > 0) {
          setExamSets(data.sets);
        }
      } else {
        setExamSets(getLocalExamSets());
      }
    } catch {
      setExamSets(getLocalExamSets());
    }

    // 3. Tải kết quả thi để phục vụ tính năng Xóa kết quả
    await loadResultsData();
    setLoading(false);
  }

  async function loadResultsData() {
    try {
      const res = await fetch("/api/admin/quiz-results");
      if (res.ok) {
        const data = await res.json();
        setAllResults(data.results || []);
      } else {
        const { data } = await supabase.from("quiz_results").select("*").order("created_at", { ascending: false });
        setAllResults(data || []);
      }
    } catch {
      const { data } = await supabase.from("quiz_results").select("*").order("created_at", { ascending: false });
      setAllResults(data || []);
    }
  }

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 6000);
  }

  // Cập nhật và lưu Settings
  async function handleSaveSettings(e) {
    if (e) e.preventDefault();
    setSaving(true);
    const updated = await saveServerSettings(settings);
    setSettings(updated);
    setPreviewSchedule(checkQuizScheduleStatus(updated));
    setSaving(false);
    showToast("✓ Cài đặt hệ thống đã được cập nhật và đồng bộ toàn bộ ứng dụng!");
  }

  // Kích hoạt 1 bộ đề thi
  async function handleActivateSet(setId) {
    const updatedSettings = {
      ...settings,
      examMode: "selected_set",
      activeExamSetId: setId,
    };
    setSettings(updatedSettings);
    await saveServerSettings(updatedSettings);
    const chosenSet = examSets.find((s) => s.id === setId);
    showToast(`✓ Đã chọn kích hoạt "${chosenSet?.name || setId}" cho các lượt thi tiếp theo!`);
  }

  // Chuyển sang chế độ Random
  async function handleSetRandomMode() {
    const updatedSettings = {
      ...settings,
      examMode: "random",
    };
    setSettings(updatedSettings);
    await saveServerSettings(updatedSettings);
    showToast("✓ Đã chuyển sang chế độ: Bốc ngẫu nhiên câu hỏi chia đều các hệ thống!");
  }

  // Tạo bộ đề mới
  async function handleCreateNewSet(e) {
    e.preventDefault();
    if (!newSetName.trim()) return;
    setCreatingSet(true);

    try {
      const res = await fetch("/api/exam-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: newSetName.trim(),
          description: newSetDesc.trim() || "Bộ đề tùy chỉnh do Quản trị viên khởi tạo.",
          questionCount: settings.questionsCount || 25,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExamSets(data.sets);
        setShowCreateSetModal(false);
        setNewSetName("");
        setNewSetDesc("");
        showToast(`✓ Đã tạo thành công ${data.set.name}!`);
      } else {
        alert("Lỗi khi tạo bộ đề mới.");
      }
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
    setCreatingSet(false);
  }

  // Xóa toàn bộ kết quả của 1 kỳ (Yêu cầu 4)
  async function handleExecuteDeletePeriod() {
    if (deleteInputText.trim().toUpperCase() !== "XÁC NHẬN") {
      alert("Vui lòng gõ đúng chữ 'XÁC NHẬN' để tiến hành xóa.");
      return;
    }

    setDeletingPeriod(true);
    try {
      const res = await fetch("/api/admin/quiz-results", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: selectedPeriod,
          deleteAllPeriod: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert("Xóa kết quả thất bại: " + (data.error || "Lỗi không xác định"));
        setDeletingPeriod(false);
        return;
      }

      showToast(`✓ ${data.message || `Đã xóa toàn bộ bài thi của kỳ ${selectedPeriod}!`}`);
      setDeletePeriodConfirmModal(false);
      setDeleteInputText("");
      await loadResultsData();
    } catch (err) {
      alert("Lỗi kết nối khi xóa: " + err.message);
    }
    setDeletingPeriod(false);
  }

  // Xóa kết quả của 1 nhân viên bất kỳ (Yêu cầu 4)
  async function handleExecuteResetSingle() {
    if (!resetSingleTarget) return;
    setResettingSingle(true);

    try {
      const res = await fetch("/api/admin/quiz-results", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resetSingleTarget.id,
          email: resetSingleTarget.email,
          period: resetSingleTarget.period,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert("Xóa thất bại: " + (data.error || "Lỗi không xác định"));
        setResettingSingle(false);
        return;
      }

      const personName = resetSingleTarget.user_name || resetSingleTarget.email;
      setResetSingleTarget(null);
      showToast(`✓ Đã xóa bài thi của nhân sự "${personName}". Nhân sự có thể vào làm lại ngay!`);
      await loadResultsData();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
    setResettingSingle(false);
  }

  // Lọc kết quả theo kỳ và tìm kiếm
  const filteredResultsForPeriod = useMemo(() => {
    return allResults.filter((r) => {
      const matchPeriod = (r.period || "khong-ro") === selectedPeriod;
      const q = searchPerson.trim().toLowerCase();
      const matchQuery =
        !q ||
        (r.user_name && r.user_name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q));
      return matchPeriod && matchQuery;
    });
  }, [allResults, selectedPeriod, searchPerson]);

  const availablePeriods = useMemo(() => {
    const s = new Set(allResults.map((r) => r.period || "khong-ro"));
    if (!s.has(getCurrentPeriod())) s.add(getCurrentPeriod());
    return Array.from(s).sort().reverse();
  }, [allResults]);

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: 960, margin: "0 auto", textAlign: "center", padding: "40px 20px" }}>
        <RefreshCw className="animate-spin" size={32} style={{ margin: "0 auto 12px auto", color: "var(--brand-cyan)" }} />
        <p style={{ color: "var(--text-dim)" }}>Đang tải cấu hình hệ thống...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 1040, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--brand-cyan)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Settings size={14} /> QUẢN TRỊ HỆ THỐNG ĐỘI ĐNCT
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 6px 0" }}>
            Cài đặt Hệ thống & Quản lý Đề thi
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--text-dim)", margin: 0 }}>
            Tất cả thay đổi tại đây sẽ tự động cập nhật đồng bộ lên Trang chủ, Quy chế thi, Đồng hồ đếm giờ và Báo cáo.
          </p>
        </div>
      </div>

      {/* Toast thông báo */}
      {toastMsg && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: 8,
            padding: "10px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#34d399",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--panel-border)", marginBottom: 22 }}>
        <button
          type="button"
          className={`filter-tab ${activeTab === "schedule" ? "active" : ""}`}
          style={{ padding: "10px 18px", fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}
          onClick={() => setActiveTab("schedule")}
        >
          <Clock size={16} /> Lịch thi & Thời gian làm bài
        </button>
        <button
          type="button"
          className={`filter-tab ${activeTab === "exam_sets" ? "active" : ""}`}
          style={{ padding: "10px 18px", fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}
          onClick={() => setActiveTab("exam_sets")}
        >
          <Layers size={16} /> Quản lý Bộ đề thi (10 Bộ đề)
        </button>
        <button
          type="button"
          className={`filter-tab ${activeTab === "delete_results" ? "active" : ""}`}
          style={{ padding: "10px 18px", fontSize: 13.5, display: "flex", alignItems: "center", gap: 8, color: "var(--danger)" }}
          onClick={() => setActiveTab("delete_results")}
        >
          <Trash2 size={16} /> Xóa kết quả & Cho thi lại
        </button>
      </div>

      {/* TAB 1: LỊCH THI & THỜI GIAN LÀM BÀI */}
      {activeTab === "schedule" && (
        <form onSubmit={handleSaveSettings}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 24 }}>
            {/* Box 1: Lịch mở thi hằng tháng & Khung giờ */}
            <div className="dashboard-section-box">
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--brand-cyan)", fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                <Calendar size={18} /> Lịch mở bài test hàng tháng & Khung giờ
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                    Ngày bắt đầu mở (Hằng tháng)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="field"
                    style={{ margin: 0 }}
                    value={settings.monthlyOpenDay}
                    onChange={(e) => setSettings({ ...settings, monthlyOpenDay: Number(e.target.value) })}
                    required
                  />
                  <span style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2, display: "block" }}>Ví dụ: ngày 27</span>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                    Ngày kết thúc (Hằng tháng)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="field"
                    style={{ margin: 0 }}
                    value={settings.monthlyCloseDay}
                    onChange={(e) => setSettings({ ...settings, monthlyCloseDay: Number(e.target.value) })}
                    required
                  />
                  <span style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2, display: "block" }}>Ví dụ: ngày 30</span>
                </div>
              </div>

              {/* Chức năng chọn khung giờ trong ngày */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--panel-border)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  marginTop: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <input
                    type="checkbox"
                    id="enableDailyHours"
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                    checked={settings.enableDailyHours}
                    onChange={(e) => setSettings({ ...settings, enableDailyHours: e.target.checked })}
                  />
                  <label htmlFor="enableDailyHours" style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                    Bật giới hạn khung giờ mở bài trong ngày
                  </label>
                </div>

                {settings.enableDailyHours ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                    <div>
                      <label style={{ fontSize: 11.5, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                        Giờ bắt đầu mở (HH:mm)
                      </label>
                      <input
                        type="time"
                        className="field"
                        style={{ margin: 0 }}
                        value={settings.dailyOpenTime}
                        onChange={(e) => setSettings({ ...settings, dailyOpenTime: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11.5, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                        Giờ đóng bài (HH:mm)
                      </label>
                      <input
                        type="time"
                        className="field"
                        style={{ margin: 0 }}
                        value={settings.dailyCloseTime}
                        onChange={(e) => setSettings({ ...settings, dailyCloseTime: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>
                    Đang tắt: Bài test mở liên tục 24/24 trong các ngày mở thi (từ 00:00 đến 23:59).
                  </div>
                )}
              </div>
            </div>

            {/* Box 2: Quy định thời gian làm bài & Đánh giá */}
            <div className="dashboard-section-box">
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--amber)", fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                <Clock size={18} /> Thời gian làm bài & Tiêu chuẩn chấm điểm
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                  Thời gian làm bài thi (phút)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    className="field"
                    style={{ margin: 0, flex: 1 }}
                    value={settings.quizDurationMinutes}
                    onChange={(e) => setSettings({ ...settings, quizDurationMinutes: Number(e.target.value) })}
                    required
                  />
                  <span style={{ fontSize: 13, color: "var(--text-dim)", whiteSpace: "nowrap" }}>phút</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, display: "block" }}>
                  Đồng hồ thi sẽ đếm ngược đúng {settings.quizDurationMinutes} phút và tự động nộp bài khi hết giờ.
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                    Số câu hỏi / đề thi
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    className="field"
                    style={{ margin: 0 }}
                    value={settings.questionsCount}
                    onChange={(e) => setSettings({ ...settings, questionsCount: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                    Chuẩn Đạt (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    className="field"
                    style={{ margin: 0 }}
                    value={settings.passScorePercent}
                    onChange={(e) => setSettings({ ...settings, passScorePercent: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              {/* Tùy chọn Xác thực Email */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <input
                  type="checkbox"
                  id="reqEmail"
                  style={{ width: 16, height: 16 }}
                  checked={settings.requireEmailVerification}
                  onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
                />
                <label htmlFor="reqEmail" style={{ fontSize: 12.5, color: "var(--text-dim)", cursor: "pointer" }}>
                  Bắt buộc nhập Email khớp danh sách nhân sự khi đăng nhập làm bài
                </label>
              </div>
            </div>
          </div>

          {/* Xem trước trạng thái khung giờ hiện tại */}
          <div
            style={{
              background: "rgba(56, 189, 248, 0.06)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 20,
              fontSize: 13,
              color: "#bae6fd",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <strong style={{ color: "#38bdf8" }}>Trạng thái áp dụng hiện tại: </strong>
              {previewSchedule?.message || "Đang kiểm tra..."}
            </div>
            <a href="/guide" style={{ color: "#38bdf8", textDecoration: "underline", fontSize: 12 }}>
              Xem trang Quy chế thi →
            </a>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="submit" className="btn-primary" disabled={saving} style={{ padding: "0 24px", height: 42 }}>
              {saving ? "Đang lưu cấu hình..." : "Lưu & Đồng bộ Toàn bộ Hệ thống"}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: QUẢN LÝ BỘ ĐỀ THI (10 BỘ ĐỀ) */}
      {activeTab === "exam_sets" && (
        <div>
          {/* Box chọn chế độ thi */}
          <div
            className="dashboard-section-box"
            style={{ marginBottom: 20, background: "linear-gradient(180deg, rgba(30,41,59,0.5) 0%, rgba(15,23,42,0.6) 100%)" }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
              Chế độ phát đề thi cho người tham gia:
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: `1px solid ${settings.examMode === "random" ? "var(--brand-cyan)" : "var(--panel-border)"}`,
                  background: settings.examMode === "random" ? "rgba(56, 189, 248, 0.12)" : "rgba(255,255,255,0.02)",
                }}
              >
                <input
                  type="radio"
                  name="examMode"
                  checked={settings.examMode === "random"}
                  onChange={handleSetRandomMode}
                  style={{ width: 18, height: 18 }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: "#fff" }}>
                    Bốc ngẫu nhiên (Random theo hệ thống)
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                    Mỗi thí sinh vào thi sẽ được sinh 1 đề ngẫu nhiên chia đều các chủ đề.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: `1px solid ${settings.examMode === "selected_set" ? "var(--ok)" : "var(--panel-border)"}`,
                  background: settings.examMode === "selected_set" ? "rgba(16, 185, 129, 0.12)" : "rgba(255,255,255,0.02)",
                }}
              >
                <input
                  type="radio"
                  name="examMode"
                  checked={settings.examMode === "selected_set"}
                  onChange={() => handleActivateSet(settings.activeExamSetId || "set-01")}
                  style={{ width: 18, height: 18 }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: "#fff" }}>
                    Áp dụng Bộ đề thi cố định
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                    Tất cả thí sinh làm bài sẽ cùng làm đúng 1 bộ đề đã chọn bên dưới.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Action bar danh sách bộ đề */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
              Danh sách Bộ đề thi chuẩn ({examSets.length} bộ đề)
            </div>
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: 13, padding: "0 14px", height: 36, display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={() => setShowCreateSetModal(true)}
            >
              <Plus size={15} /> Thêm bộ đề mới
            </button>
          </div>

          {/* Grid 10 bộ đề thi */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14, marginBottom: 20 }}>
            {examSets.map((set) => {
              const isActive = settings.examMode === "selected_set" && settings.activeExamSetId === set.id;
              return (
                <div
                  key={set.id}
                  style={{
                    background: isActive ? "rgba(16, 185, 129, 0.08)" : "rgba(255, 255, 255, 0.02)",
                    border: `1px solid ${isActive ? "rgba(16, 185, 129, 0.5)" : "var(--panel-border)"}`,
                    borderRadius: 10,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: isActive ? "var(--ok)" : "rgba(255, 255, 255, 0.1)",
                          color: isActive ? "#000" : "#fff",
                        }}
                      >
                        {set.code || set.id.toUpperCase()}
                      </span>
                      {isActive && (
                        <span style={{ fontSize: 11, color: "var(--ok)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle2 size={13} /> ĐANG ÁP DỤNG THI
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: "0 0 6px 0", color: "#fff" }}>
                      {set.name}
                    </h3>
                    <p style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5, margin: "0 0 10px 0" }}>
                      {set.description}
                    </p>
                    {set.focusCategories && set.focusCategories.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                        {set.focusCategories.slice(0, 3).map((cat, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: 10.5,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "rgba(255, 255, 255, 0.05)",
                              color: "var(--brand-cyan)",
                            }}
                          >
                            {cat}
                          </span>
                        ))}
                        {set.focusCategories.length > 3 && (
                          <span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
                            +{set.focusCategories.length - 3} hệ khác
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      type="button"
                      className={isActive ? "btn-primary" : "btn-secondary"}
                      style={{
                        flex: 1,
                        fontSize: 12,
                        padding: "0 10px",
                        height: 34,
                        background: isActive ? "var(--ok)" : undefined,
                        color: isActive ? "#000" : undefined,
                        fontWeight: 700,
                      }}
                      onClick={() => handleActivateSet(set.id)}
                    >
                      {isActive ? "✓ Đề đang được chọn" : "Chọn áp dụng đề này"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: XÓA KẾT QUẢ THEO KỲ & NHÂN VIÊN (Yêu cầu 4) */}
      {activeTab === "delete_results" && (
        <div>
          {/* Cảnh báo & Box Xóa theo kỳ */}
          <div
            style={{
              background: "rgba(244, 63, 94, 0.06)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)", fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
              <ShieldAlert size={20} />
              Quản lý Xóa Kết quả Bài làm & Cấp quyền Thi lại
            </div>
            <p style={{ fontSize: 13, color: "var(--text)", margin: "0 0 16px 0", lineHeight: 1.5 }}>
              Quản trị viên có thể chọn <strong>Xóa toàn bộ kết quả của 1 kỳ</strong> (reset cả tháng để thi lại từ đầu) hoặc <strong>xóa bài của từng nhân sự</strong> để cấp quyền cho nhân sự đó vào làm lại bài thi mới.
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, background: "rgba(0,0,0,0.3)", padding: 14, borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Chọn kỳ thi cần quản lý:</label>
                <select
                  className="field"
                  style={{ width: "auto", margin: 0, minWidth: 160 }}
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  {availablePeriods.map((p) => (
                    <option key={p} value={p}>
                      {formatPeriodLabel(p)} ({allResults.filter((r) => (r.period || "khong-ro") === p).length} bài thi)
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="btn-primary"
                style={{
                  background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                  borderColor: "#f43f5e",
                  fontSize: 13,
                  padding: "0 18px",
                  height: 38,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onClick={() => {
                  setDeletePeriodConfirmModal(true);
                  setDeleteInputText("");
                }}
              >
                <Trash2 size={15} /> Xóa toàn bộ kết quả kỳ {formatPeriodLabel(selectedPeriod)}
              </button>
            </div>
          </div>

          {/* Bảng danh sách bài thi trong kỳ để xóa theo từng người */}
          <div className="dashboard-section-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                Danh sách nhân sự đã làm bài trong kỳ {formatPeriodLabel(selectedPeriod)} ({filteredResultsForPeriod.length} lượt)
              </div>
              <div style={{ position: "relative", minWidth: 260 }}>
                <input
                  type="text"
                  className="field"
                  style={{ paddingLeft: 34, margin: 0, height: 36, fontSize: 13 }}
                  placeholder="Tìm theo họ tên hoặc email..."
                  value={searchPerson}
                  onChange={(e) => setSearchPerson(e.target.value)}
                />
                <Search size={14} style={{ position: "absolute", left: 12, top: 11, color: "var(--text-dim)" }} />
              </div>
            </div>

            {filteredResultsForPeriod.length === 0 ? (
              <p style={{ textAlign: "center", padding: "24px 0", color: "var(--text-dim)", fontSize: 13 }}>
                Không có bài thi nào trong kỳ này hoặc không khớp với từ khóa tìm kiếm.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Họ và tên</th>
                      <th>Email</th>
                      <th style={{ textAlign: "center" }}>Điểm số</th>
                      <th style={{ textAlign: "center" }}>Tỷ lệ</th>
                      <th style={{ textAlign: "center" }}>Thời gian thi</th>
                      <th style={{ textAlign: "center", width: 130 }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResultsForPeriod.map((r) => {
                      const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                      const isPass = pct >= 80;
                      return (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600, color: "var(--text)" }}>{r.user_name}</td>
                          <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>
                            {r.email || "—"}
                          </td>
                          <td style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                            {r.score}/{r.total}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontWeight: 700,
                                color: isPass ? "var(--ok)" : "var(--danger)",
                              }}
                            >
                              {pct}%
                            </span>
                          </td>
                          <td style={{ textAlign: "center", fontSize: 12, color: "var(--text-dim)" }}>
                            {new Date(r.created_at).toLocaleString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{
                                fontSize: 11,
                                padding: "4px 10px",
                                color: "var(--danger)",
                                borderColor: "rgba(244, 63, 94, 0.4)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                cursor: "pointer",
                              }}
                              title="Xóa bài thi để cho phép nhân sự này vào thi lại"
                              onClick={() => setResetSingleTarget(r)}
                            >
                              <RotateCcw size={12} /> Cho thi lại
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: XÁC NHẬN XÓA TOÀN BỘ KẾT QUẢ KỲ */}
      {deletePeriodConfirmModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div className="card" style={{ maxWidth: 460, width: "100%", border: "1px solid rgba(244, 63, 94, 0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)", fontWeight: 800, fontSize: 16, marginBottom: 12 }}>
              <AlertTriangle size={22} />
              CẢNH BÁO: XÓA TOÀN BỘ KỲ {formatPeriodLabel(selectedPeriod)}
            </div>
            <p style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.6, margin: "0 0 14px 0" }}>
              Thao tác này sẽ <strong>xóa sạch tất cả bài thi và điểm số</strong> của kỳ <strong>{formatPeriodLabel(selectedPeriod)}</strong>.
              Tất cả nhân sự trong kỳ này sẽ được mở khóa để thi lại bài mới từ đầu.
            </p>
            <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 8px 0" }}>
              Để xác nhận, vui lòng nhập chữ <strong>XÁC NHẬN</strong> vào ô dưới đây:
            </p>
            <input
              type="text"
              className="field"
              placeholder="Gõ XÁC NHẬN..."
              value={deleteInputText}
              onChange={(e) => setDeleteInputText(e.target.value)}
              style={{ marginBottom: 16, borderColor: "rgba(244, 63, 94, 0.4)" }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeletePeriodConfirmModal(false)}
                disabled={deletingPeriod}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)", borderColor: "#f43f5e" }}
                onClick={handleExecuteDeletePeriod}
                disabled={deletingPeriod || deleteInputText.trim().toUpperCase() !== "XÁC NHẬN"}
              >
                {deletingPeriod ? "Đang xóa..." : "Xác nhận Xóa Toàn bộ Kỳ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: XÁC NHẬN XÓA 1 BÀI THI CHO THI LẠI */}
      {resetSingleTarget && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div className="card" style={{ maxWidth: 440, width: "100%", border: "1px solid rgba(244, 63, 94, 0.4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)", fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
              <AlertTriangle size={20} />
              Xác nhận Cho thi lại
            </div>
            <p style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.5, margin: "0 0 12px 0" }}>
              Bạn muốn xóa kết quả bài thi của nhân sự:
            </p>
            <div style={{ background: "rgba(255,255,255,0.04)", padding: "10px 14px", borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{resetSingleTarget.user_name}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                Email: {resetSingleTarget.email}
              </div>
              <div style={{ fontSize: 12, color: "var(--brand-cyan)", marginTop: 4 }}>
                Điểm hiện tại: {resetSingleTarget.score}/{resetSingleTarget.total} ({formatPeriodLabel(resetSingleTarget.period || "khong-ro")})
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#fda4af", margin: "0 0 18px 0", lineHeight: 1.5 }}>
              Sau khi xóa, nhân sự này sẽ được phép truy cập trang chủ và làm lại bài thi mới ngay lập tức.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setResetSingleTarget(null)}
                disabled={resettingSingle}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)", borderColor: "#f43f5e" }}
                onClick={handleExecuteResetSingle}
                disabled={resettingSingle}
              >
                {resettingSingle ? "Đang xóa..." : "Xóa & Cho thi lại"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: TẠO BỘ ĐỀ MỚI */}
      {showCreateSetModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div className="card" style={{ maxWidth: 480, width: "100%", border: "1px solid var(--panel-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--brand-cyan)", fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
              <Plus size={18} /> Thêm Bộ đề thi mới
            </div>
            <form onSubmit={handleCreateNewSet}>
              <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                Tên bộ đề thi (ví dụ: Bộ đề số 11: Kiểm tra chuyên đề An toàn PCCC)
              </label>
              <input
                type="text"
                className="field"
                placeholder="Nhập tên bộ đề..."
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                required
                style={{ marginBottom: 12 }}
              />

              <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                Mô tả nội dung trọng tâm
              </label>
              <textarea
                className="field"
                rows={3}
                placeholder="Mô tả các hệ thống hoặc nội dung kiến thức của đề..."
                value={newSetDesc}
                onChange={(e) => setNewSetDesc(e.target.value)}
                style={{ marginBottom: 16 }}
              />

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateSetModal(false)}
                  disabled={creatingSet}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={creatingSet || !newSetName.trim()}>
                  {creatingSet ? "Đang tạo..." : "Tạo bộ đề"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer link */}
      <div className="link-row" style={{ marginTop: 24, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/">
            <button type="button" className="btn-secondary">← Trang chủ</button>
          </a>
          <a href="/dashboard">
            <button type="button" className="btn-secondary">Dashboard Quản lý</button>
          </a>
          <a href="/admin-questions">
            <button type="button" className="btn-secondary">Ngân hàng Câu hỏi</button>
          </a>
        </div>
      </div>
    </div>
  );
}
