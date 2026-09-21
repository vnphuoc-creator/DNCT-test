"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { FIXED_CATEGORIES } from "../../lib/categories";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  Search,
  RefreshCw,
  Layers,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

const emptyForm = {
  id: null,
  question_text: "",
  options: ["", ""],
  correct_index: 0,
  category: "",
  explanation: "",
  image_url: "",
};

export default function AdminQuestionsPage() {
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [errorMsg, setErrorMsg] = useState("");
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [mode, setMode] = useState("list"); // list | edit
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [customCategory, setCustomCategory] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // State cho Modal Import File (Word, PDF, Excel) - Yêu cầu 5
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importCategory, setImportCategory] = useState("auto");
  const [parsing, setParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState(null);
  const [savingImport, setSavingImport] = useState(false);
  const [importError, setImportError] = useState("");

  useEffect(() => {
    loadQuestions();
  }, []);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 5000);
  }

  async function loadQuestions() {
    setStatus("loading");
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("id", { ascending: true });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }
    setQuestions(data || []);
    setStatus("ready");
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return questions.filter((item) => {
      const matchesSearch =
        !q ||
        item.question_text.toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q);
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [questions, search, categoryFilter]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const q of questions) {
      const key = q.category || "";
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [questions]);

  function openCreate() {
    setForm(emptyForm);
    setCustomCategory(false);
    setSaveError("");
    setMode("edit");
  }

  function openEdit(item) {
    const cat = item.category || "";
    setForm({
      id: item.id,
      question_text: item.question_text,
      options: [...item.options],
      correct_index: item.correct_index,
      category: cat,
      explanation: item.explanation || "",
      image_url: item.image_url || "",
    });
    setCustomCategory(cat !== "" && !FIXED_CATEGORIES.includes(cat));
    setSaveError("");
    setMode("edit");
  }

  function updateOption(index, value) {
    setForm((f) => {
      const options = [...f.options];
      options[index] = value;
      return { ...f, options };
    });
  }

  function addOption() {
    setForm((f) => ({ ...f, options: [...f.options, ""] }));
  }

  function removeOption(index) {
    setForm((f) => {
      const options = f.options.filter((_, i) => i !== index);
      const correct_index = f.correct_index >= options.length ? 0 : f.correct_index;
      return { ...f, options, correct_index };
    });
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveError("Chỉ chọn được file ảnh (jpg, png, webp...).");
      return;
    }

    setUploadingImage(true);
    setSaveError("");

    try {
      const ext = file.name.split(".").pop();
      const filename = `question_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { data, error } = await supabase.storage.from("questions").upload(filename, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) {
        setSaveError("Lỗi tải ảnh lên Supabase Storage: " + error.message);
        setUploadingImage(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("questions").getPublicUrl(filename);
      if (publicUrlData && publicUrlData.publicUrl) {
        setForm((f) => ({ ...f, image_url: publicUrlData.publicUrl }));
      }
    } catch (err) {
      setSaveError("Lỗi ngoại lệ khi tải ảnh: " + err.message);
    }
    setUploadingImage(false);
  }

  function removeImage() {
    setForm((f) => ({ ...f, image_url: "" }));
  }

  async function handleSaveSingle(e) {
    e.preventDefault();
    setSaveError("");

    if (!form.question_text.trim()) {
      setSaveError("Vui lòng nhập nội dung câu hỏi.");
      return;
    }

    const cleanedOptions = form.options.map((o) => o.trim()).filter(Boolean);
    if (cleanedOptions.length < 2) {
      setSaveError("Câu hỏi cần ít nhất 2 đáp án.");
      return;
    }

    if (form.correct_index < 0 || form.correct_index >= cleanedOptions.length) {
      setSaveError("Vui lòng chọn 1 đáp án đúng.");
      return;
    }

    setSaving(true);

    const payload = {
      question_text: form.question_text.trim(),
      options: cleanedOptions,
      correct_index: form.correct_index,
      category: form.category.trim() || null,
      explanation: form.explanation.trim() || null,
      image_url: form.image_url || null,
    };

    let error;
    if (form.id) {
      const res = await supabase.from("questions").update(payload).eq("id", form.id);
      error = res.error;
    } else {
      const res = await supabase.from("questions").insert(payload);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      setSaveError("Lỗi lưu câu hỏi: " + error.message);
      return;
    }

    showToast(form.id ? "✓ Đã cập nhật câu hỏi!" : "✓ Đã thêm câu hỏi mới!");
    setMode("list");
    loadQuestions();
  }

  async function handleDelete(item) {
    if (!confirm(`Bạn có chắc muốn xoá câu hỏi #${item.id}: "${item.question_text.slice(0, 40)}..."?`)) {
      return;
    }
    const { error } = await supabase.from("questions").delete().eq("id", item.id);
    if (error) {
      alert("Lỗi xoá câu hỏi: " + error.message);
      return;
    }
    showToast("✓ Đã xoá câu hỏi!");
    loadQuestions();
  }

  // --- XỬ LÝ IMPORT FILE WORD (.docx), PDF (.pdf), EXCEL (.xlsx) (YÊU CẦU 5) ---
  async function handleAnalyzeFile(e) {
    e.preventDefault();
    if (!importFile) {
      setImportError("Vui lòng chọn một file Word, PDF hoặc Excel.");
      return;
    }

    setParsing(true);
    setImportError("");
    setParsedPreview(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("category", importCategory);

      const res = await fetch("/api/admin/parse-questions", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error || "Không thể phân tích file.");
        setParsing(false);
        return;
      }

      setParsedPreview(data);
    } catch (err) {
      setImportError("Lỗi kết nối khi phân tích file: " + err.message);
    }
    setParsing(false);
  }

  async function handleConfirmSaveImport() {
    if (!parsedPreview || !parsedPreview.questions || parsedPreview.questions.length === 0) {
      return;
    }

    setSavingImport(true);
    setImportError("");

    try {
      const questionsToInsert = parsedPreview.questions.map((q) => ({
        question_text: q.question_text,
        options: q.options,
        correct_index: q.correct_index,
        category: q.category || null,
        explanation: q.explanation || null,
        image_url: q.image_url || null,
      }));

      const { data, error } = await supabase.from("questions").insert(questionsToInsert).select("id");

      if (error) {
        setImportError("Lỗi lưu vào Supabase: " + error.message);
        setSavingImport(false);
        return;
      }

      const count = data ? data.length : questionsToInsert.length;
      showToast(`✓ Đã nhập thành công ${count} câu hỏi vào Ngân hàng câu hỏi!`);
      setShowImportModal(false);
      setImportFile(null);
      setParsedPreview(null);
      await loadQuestions();
    } catch (err) {
      setImportError("Lỗi ngoại lệ khi lưu: " + err.message);
    }
    setSavingImport(false);
  }

  if (mode === "edit") {
    return (
      <div className="card" style={{ maxWidth: 840, margin: "0 auto" }}>
        <div className="eyebrow">{form.id ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 16px 0" }}>
          {form.id ? `Câu hỏi #${form.id}` : "Tạo câu hỏi mới"}
        </h1>

        {saveError && <div className="error-box">{saveError}</div>}

        <form onSubmit={handleSaveSingle}>
          <label>Nội dung câu hỏi</label>
          <textarea
            className="field"
            rows={3}
            value={form.question_text}
            onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
            placeholder="Nhập nội dung câu hỏi..."
            required
          />

          <label>Chủ đề / Hệ thống</label>
          {!customCategory ? (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <select
                className="field"
                style={{ flex: 1, margin: 0 }}
                value={form.category}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setCustomCategory(true);
                    setForm((f) => ({ ...f, category: "" }));
                  } else {
                    setForm((f) => ({ ...f, category: e.target.value }));
                  }
                }}
              >
                <option value="">— Chọn một hệ thống —</option>
                {FIXED_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__custom__">+ Nhập chủ đề tuỳ ý khác...</option>
              </select>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                className="field"
                style={{ flex: 1, margin: 0 }}
                type="text"
                placeholder="Gõ tên chủ đề mới..."
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setCustomCategory(false);
                  setForm((f) => ({ ...f, category: "" }));
                }}
              >
                Chọn từ danh sách
              </button>
            </div>
          )}

          <label>Hình ảnh minh hoạ (không bắt buộc)</label>
          {form.image_url ? (
            <div style={{ marginBottom: 16 }}>
              <img
                src={form.image_url}
                alt=""
                style={{
                  maxHeight: 200,
                  borderRadius: 8,
                  border: "1px solid var(--panel-border)",
                  display: "block",
                  marginBottom: 8,
                }}
              />
              <button type="button" className="btn-secondary" onClick={removeImage}>
                Xoá ảnh
              </button>
            </div>
          ) : (
            <input
              className="field"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImage}
            />
          )}

          <label>Các đáp án (chọn nút tròn cho đáp án đúng)</label>
          {form.options.map((opt, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <input
                type="radio"
                name="correct_index"
                checked={form.correct_index === i}
                onChange={() => setForm((f) => ({ ...f, correct_index: i }))}
                style={{ width: 18, height: 18, flexShrink: 0 }}
                title="Đánh dấu là đáp án đúng"
              />
              <input
                className="field"
                style={{ margin: 0, flex: 1 }}
                type="text"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Đáp án ${i + 1}`}
                required
              />
              {form.options.length > 2 && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "8px 10px", flexShrink: 0 }}
                  onClick={() => removeOption(i)}
                >
                  Xoá
                </button>
              )}
            </div>
          ))}
          {form.options.length < 6 && (
            <button
              type="button"
              className="btn-secondary"
              style={{ marginBottom: 18 }}
              onClick={addOption}
            >
              + Thêm đáp án
            </button>
          )}

          <label>Giải thích đáp án (không bắt buộc)</label>
          <textarea
            className="field"
            rows={3}
            value={form.explanation}
            onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
            placeholder="Vì sao đáp án này đúng..."
          />

          <div className="link-row" style={{ marginTop: 16 }}>
            <button type="submit" className="btn-primary" disabled={saving || uploadingImage}>
              {saving ? "Đang lưu..." : "Lưu câu hỏi"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setMode("list")}
              disabled={saving || uploadingImage}
            >
              Huỷ
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 1040, margin: "0 auto" }}>
      {/* Header & Toast */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--brand-cyan)", fontWeight: 700 }}>
            QUẢN TRỊ NGÂN HÀNG CÂU HỎI
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 6px 0" }}>
            Ngân hàng Câu hỏi Sát hạch ({questions.length} câu)
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>
            Quản lý, thêm mới hoặc nhập hàng loạt từ file Word (.docx), PDF (.pdf), Excel (.xlsx).
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-primary"
            style={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              fontSize: 13.5,
              padding: "0 16px",
              height: 38,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
            onClick={() => {
              setShowImportModal(true);
              setParsedPreview(null);
              setImportError("");
            }}
          >
            <Upload size={16} /> Import từ File (Word, PDF, Excel)
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: 13.5, padding: "0 16px", height: 38, display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={openCreate}
          >
            <Plus size={16} /> Thêm câu hỏi thủ công
          </button>
        </div>
      </div>

      {toastMsg && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: 8,
            padding: "10px 14px",
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

      {/* Filter Bar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 2, minWidth: 240 }}>
          <input
            className="field"
            style={{ paddingLeft: 36, margin: 0 }}
            type="text"
            placeholder="Tìm theo nội dung câu hỏi hoặc chủ đề..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={16} style={{ position: "absolute", left: 12, top: 13, color: "var(--text-dim)" }} />
        </div>
        <select
          className="field"
          style={{ flex: 1, minWidth: 220, margin: 0 }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Tất cả các hệ thống ({questions.length} câu)</option>
          {FIXED_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c} ({categoryCounts[c] || 0})
            </option>
          ))}
          {categoryCounts[""] > 0 && (
            <option value="__none__" disabled>
              — {categoryCounts[""]} câu chưa gán chủ đề —
            </option>
          )}
        </select>
      </div>

      {/* Questions Table */}
      <div style={{ maxHeight: 580, overflowY: "auto", border: "1px solid var(--panel-border)", borderRadius: 10 }}>
        <table style={{ marginTop: 0 }}>
          <thead>
            <tr>
              <th style={{ width: 44 }}></th>
              <th>Nội dung Câu hỏi</th>
              <th style={{ width: 220 }}>Chủ đề / Hệ thống</th>
              <th style={{ width: 130, textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt=""
                      style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }}
                    />
                  )}
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: "var(--text)" }}>{item.question_text}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 4 }}>
                    {item.options ? item.options.length : 0} phương án • Đáp án đúng:{" "}
                    <strong>{String.fromCharCode(65 + (item.correct_index || 0))}</strong>
                  </div>
                </td>
                <td>
                  <span
                    style={{
                      fontSize: 11.5,
                      padding: "3px 8px",
                      borderRadius: 4,
                      background: "rgba(255,255,255,0.05)",
                      color: "var(--brand-cyan)",
                      display: "inline-block",
                    }}
                  >
                    {item.category || "Chưa phân loại"}
                  </span>
                </td>
                <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                  <button
                    className="btn-secondary"
                    style={{ padding: "5px 10px", fontSize: 12, marginRight: 6 }}
                    onClick={() => openEdit(item)}
                  >
                    Sửa
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: "5px 10px", fontSize: 12, color: "var(--danger)" }}
                    onClick={() => handleDelete(item)}
                  >
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p style={{ padding: 24, textAlign: "center", color: "var(--text-dim)", margin: 0 }}>
            Không tìm thấy câu hỏi nào phù hợp với bộ lọc.
          </p>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="link-row" style={{ marginTop: 20, justifyContent: "space-between" }}>
        <a href="/">
          <button type="button" className="btn-secondary">← Trang chủ</button>
        </a>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/admin-settings">
            <button type="button" className="btn-secondary">Cài đặt Hệ thống & Bộ đề</button>
          </a>
          <a href="/dashboard">
            <button type="button" className="btn-secondary">Dashboard Quản lý</button>
          </a>
        </div>
      </div>

      {/* MODAL IMPORT TỪ FILE WORD / PDF / EXCEL (YÊU CẦU 5) */}
      {showImportModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 780,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              border: "1px solid var(--panel-border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--brand-cyan)", fontWeight: 700, fontSize: 16 }}>
                <Upload size={18} /> Nhập Câu hỏi từ File (Word .docx, PDF, Excel .xlsx)
              </div>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "4px 10px", fontSize: 12 }}
                onClick={() => {
                  setShowImportModal(false);
                  setParsedPreview(null);
                }}
              >
                ✕ Đóng
              </button>
            </div>

            {importError && <div className="error-box" style={{ marginBottom: 14 }}>{importError}</div>}

            {/* Bước 1: Chọn file và Chọn Hệ cần Import */}
            {!parsedPreview ? (
              <form onSubmit={handleAnalyzeFile}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#fff", display: "block", marginBottom: 6 }}>
                    1. Chọn file tài liệu câu hỏi (.docx, .pdf, .xlsx, .txt)
                  </label>
                  <input
                    type="file"
                    className="field"
                    accept=".docx,.pdf,.xlsx,.xls,.txt"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    required
                  />
                  <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 4 }}>
                    Hỗ trợ định dạng Word (.docx), PDF (.pdf), Excel (.xlsx) với cấu trúc câu hỏi rõ ràng (Ví dụ: &quot;Câu 1: ...&quot;, &quot;A. ...&quot;, &quot;B. ...&quot;, &quot;Đáp án: A&quot;).
                  </div>
                </div>

                {/* Dropdown Chọn Hệ (Category) để gán cho các câu hỏi */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#fff", display: "block", marginBottom: 6 }}>
                    2. Chọn Hệ thống / Chủ đề để gán cho toàn bộ câu hỏi trong file này:
                  </label>
                  <select
                    className="field"
                    value={importCategory}
                    onChange={(e) => setImportCategory(e.target.value)}
                  >
                    <option value="auto">⚡ Tự động nhận diện hệ thống theo nội dung từng câu hỏi</option>
                    <optgroup label="Hoặc gán cố định cho một Hệ thống cụ thể:">
                      {FIXED_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 4 }}>
                    Nếu bạn chọn một Hệ cụ thể (ví dụ: <em>Hệ thống trung thế</em>), toàn bộ câu hỏi trích xuất từ file sẽ được tự động gán vào Hệ đó.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowImportModal(false)}
                    disabled={parsing}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={parsing || !importFile}
                    style={{ minWidth: 160 }}
                  >
                    {parsing ? "Đang phân tích file..." : "Phân tích nội dung file →"}
                  </button>
                </div>
              </form>
            ) : (
              // Bước 2: Xem trước kết quả bóc tách và xác nhận lưu
              <div>
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: 8,
                    padding: "12px 16px",
                    marginBottom: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: "#34d399", fontSize: 14 }}>
                      ✓ Đã bóc tách thành công {parsedPreview.totalCount} câu hỏi từ file &quot;{parsedPreview.fileName}&quot;!
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                      Hệ thống áp dụng: <strong>{parsedPreview.categoryApplied}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: "4px 10px" }}
                    onClick={() => setParsedPreview(null)}
                  >
                    Chọn file khác
                  </button>
                </div>

                {/* Danh sách câu hỏi xem trước */}
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#fff" }}>
                  Xem trước {parsedPreview.questions.length} câu hỏi chuẩn bị nhập:
                </div>
                <div
                  style={{
                    maxHeight: 380,
                    overflowY: "auto",
                    border: "1px solid var(--panel-border)",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 20,
                    background: "rgba(0,0,0,0.2)",
                  }}
                >
                  {parsedPreview.questions.map((q, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 6,
                        background: "rgba(255,255,255,0.03)",
                        marginBottom: 10,
                        borderLeft: "3px solid var(--brand-cyan)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: "#fff" }}>
                          Câu {idx + 1}: {q.question_text}
                        </div>
                        <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", whiteSpace: "nowrap" }}>
                          {q.category}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = oIdx === q.correct_index;
                          return (
                            <div
                              key={oIdx}
                              style={{
                                color: isCorrect ? "var(--ok)" : "var(--text-dim)",
                                fontWeight: isCorrect ? 700 : 400,
                              }}
                            >
                              {String.fromCharCode(65 + oIdx)}. {opt} {isCorrect && "✓ (Đáp án đúng)"}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <div style={{ fontSize: 11.5, color: "var(--brand-cyan)", marginTop: 6, fontStyle: "italic" }}>
                          Giải thích: {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setParsedPreview(null)}
                    disabled={savingImport}
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", borderColor: "#10b981" }}
                    onClick={handleConfirmSaveImport}
                    disabled={savingImport}
                  >
                    {savingImport ? "Đang lưu câu hỏi..." : `Xác nhận Lưu ${parsedPreview.questions.length} câu hỏi vào Ngân hàng`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
