"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { FIXED_CATEGORIES } from "../../lib/categories";

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

  useEffect(() => {
    loadQuestions();
  }, []);

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

  // Đếm số câu mỗi chủ đề, để hiện luôn trong dropdown cho dễ hình dung
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
    // Nếu chủ đề hiện tại không nằm trong danh sách cố định, mở sẵn ô gõ tự do
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
    if (file.size > 5 * 1024 * 1024) {
      setSaveError("Ảnh quá lớn, chọn ảnh dưới 5MB nhé.");
      return;
    }

    setUploadingImage(true);
    setSaveError("");

    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("question-images")
      .upload(fileName, file);

    if (uploadError) {
      setUploadingImage(false);
      setSaveError("Tải ảnh lên thất bại: " + uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from("question-images").getPublicUrl(fileName);

    setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
    setUploadingImage(false);
  }

  function removeImage() {
    setForm((f) => ({ ...f, image_url: "" }));
  }

  function validateForm() {
    if (!form.question_text.trim()) return "Chưa nhập nội dung câu hỏi.";
    const cleanedOptions = form.options.map((o) => o.trim());
    if (cleanedOptions.some((o) => o === "")) return "Có đáp án đang để trống.";
    if (cleanedOptions.length < 2) return "Cần ít nhất 2 đáp án.";
    if (form.correct_index < 0 || form.correct_index >= cleanedOptions.length)
      return "Chưa chọn đáp án đúng hợp lệ.";
    return "";
  }

  async function handleSave(e) {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    setSaving(true);
    setSaveError("");

    const payload = {
      question_text: form.question_text.trim(),
      options: form.options.map((o) => o.trim()),
      correct_index: form.correct_index,
      category: form.category.trim() || null,
      explanation: form.explanation.trim() || null,
      image_url: form.image_url || null,
    };

    let error;
    if (form.id) {
      ({ error } = await supabase.from("questions").update(payload).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("questions").insert(payload));
    }

    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setMode("list");
    loadQuestions();
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(
      `Xoá câu hỏi này?\n\n"${item.question_text}"\n\nKhông thể khôi phục lại được.`
    );
    if (!confirmed) return;
    const { error } = await supabase.from("questions").delete().eq("id", item.id);
    if (error) {
      alert("Xoá thất bại: " + error.message);
      return;
    }
    loadQuestions();
  }

  if (status === "loading") {
    return (
      <div className="card">
        <p>Đang tải danh sách câu hỏi...</p>
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

  if (mode === "edit") {
    return (
      <div className="card" style={{ maxWidth: 640 }}>
        <div className="eyebrow">Quản lý câu hỏi</div>
        <h2>{form.id ? "Sửa câu hỏi" : "Thêm câu hỏi mới"}</h2>

        <form onSubmit={handleSave}>
          {saveError && <div className="error-box">{saveError}</div>}

          <label>Nội dung câu hỏi</label>
          <textarea
            className="field"
            rows={3}
            value={form.question_text}
            onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
          />

          <label>Chủ đề</label>
          {customCategory ? (
            <>
              <input
                className="field"
                type="text"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Gõ tên chủ đề mới..."
              />
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: -10, marginBottom: 18, fontSize: 13, padding: "6px 10px" }}
                onClick={() => {
                  setCustomCategory(false);
                  setForm((f) => ({ ...f, category: "" }));
                }}
              >
                ← Chọn từ danh sách có sẵn
              </button>
            </>
          ) : (
            <select
              className="field"
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
              <option value="">— Chưa chọn chủ đề —</option>
              {FIXED_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__custom__">+ Chủ đề khác (gõ tay)...</option>
            </select>
          )}

          <label>Hình ảnh minh hoạ (không bắt buộc)</label>
          {form.image_url ? (
            <div style={{ marginBottom: 18 }}>
              <img
                src={form.image_url}
                alt="Ảnh minh hoạ câu hỏi"
                style={{
                  maxWidth: "100%",
                  maxHeight: 220,
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
          {uploadingImage && (
            <p style={{ marginTop: -10, fontSize: 13 }}>Đang tải ảnh lên...</p>
          )}

          <label>Các đáp án (bấm vào nút tròn để chọn đáp án đúng)</label>
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

          <div className="link-row">
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
    <div className="card" style={{ maxWidth: 1040 }}>
      <div className="eyebrow">Quản lý câu hỏi</div>
      <h1>Ngân hàng câu hỏi ({questions.length} câu)</h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          className="field"
          style={{ flex: 2, minWidth: 220 }}
          type="text"
          placeholder="Tìm theo nội dung câu hỏi hoặc chủ đề..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="field"
          style={{ flex: 1, minWidth: 200 }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Tất cả chủ đề ({questions.length} câu)</option>
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
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, marginBottom: 18 }}>
        <button className="btn-primary" onClick={openCreate}>
          + Thêm câu hỏi
        </button>
      </div>

      <div style={{ maxHeight: 560, overflowY: "auto", border: "1px solid var(--panel-border)", borderRadius: 10 }}>
        <table style={{ marginTop: 0 }}>
          <thead>
            <tr>
              <th></th>
              <th>Câu hỏi</th>
              <th>Chủ đề</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td style={{ width: 44 }}>
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt=""
                      style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }}
                    />
                  )}
                </td>
                <td>{item.question_text}</td>
                <td style={{ whiteSpace: "nowrap" }}>{item.category || "—"}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    className="btn-secondary"
                    style={{ padding: "6px 10px", fontSize: 13, marginRight: 6 }}
                    onClick={() => openEdit(item)}
                  >
                    Sửa
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: "6px 10px", fontSize: 13, color: "var(--danger)" }}
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
          <p style={{ padding: 16, textAlign: "center" }}>Không tìm thấy câu hỏi nào khớp.</p>
        )}
      </div>

      <div className="link-row">
        <a href="/">
          <button className="btn-secondary">← Trang chủ</button>
        </a>
      </div>
    </div>
  );
}
