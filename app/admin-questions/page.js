"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const emptyForm = {
  id: null,
  question_text: "",
  options: ["", ""],
  correct_index: 0,
  category: "",
  explanation: "",
};

export default function AdminQuestionsPage() {
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [errorMsg, setErrorMsg] = useState("");
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("list"); // list | edit
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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
    if (!q) return questions;
    return questions.filter(
      (item) =>
        item.question_text.toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q)
    );
  }, [questions, search]);

  function openCreate() {
    setForm(emptyForm);
    setSaveError("");
    setMode("edit");
  }

  function openEdit(item) {
    setForm({
      id: item.id,
      question_text: item.question_text,
      options: [...item.options],
      correct_index: item.correct_index,
      category: item.category || "",
      explanation: item.explanation || "",
    });
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

          <label>Chủ đề (không bắt buộc)</label>
          <input
            className="field"
            type="text"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="Ví dụ: Trạm bơm nước cấp"
          />

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
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu câu hỏi"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setMode("list")}
              disabled={saving}
            >
              Huỷ
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 800 }}>
      <div className="eyebrow">Quản lý câu hỏi</div>
      <h1>Ngân hàng câu hỏi ({questions.length} câu)</h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <input
          className="field"
          style={{ margin: 0, flex: 1 }}
          type="text"
          placeholder="Tìm theo nội dung hoặc chủ đề..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-primary" style={{ flexShrink: 0 }} onClick={openCreate}>
          + Thêm câu hỏi
        </button>
      </div>

      <div style={{ maxHeight: 560, overflowY: "auto", border: "1px solid var(--panel-border)", borderRadius: 10 }}>
        <table style={{ marginTop: 0 }}>
          <thead>
            <tr>
              <th>Câu hỏi</th>
              <th>Chủ đề</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
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
                    style={{ padding: "6px 10px", fontSize: 13, color: "var(--wrong)" }}
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
