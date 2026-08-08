"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const emptyForm = { id: null, full_name: "", email: "" };

export default function AdminUsersPage() {
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("list"); // list | edit
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setStatus("loading");
    const { data, error } = await supabase
      .from("allowed_users")
      .select("*")
      .order("full_name", { ascending: true });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }
    setUsers(data || []);
    setStatus("ready");
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  function openCreate() {
    setForm(emptyForm);
    setSaveError("");
    setMode("edit");
  }

  function openEdit(item) {
    setForm({ id: item.id, full_name: item.full_name, email: item.email });
    setSaveError("");
    setMode("edit");
  }

  async function handleSave(e) {
    e.preventDefault();
    const name = form.full_name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name) {
      setSaveError("Chưa nhập họ tên.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSaveError("Email không đúng định dạng.");
      return;
    }

    setSaving(true);
    setSaveError("");

    let error;
    if (form.id) {
      ({ error } = await supabase
        .from("allowed_users")
        .update({ full_name: name, email })
        .eq("id", form.id));
    } else {
      ({ error } = await supabase.from("allowed_users").insert({ full_name: name, email }));
    }

    setSaving(false);
    if (error) {
      setSaveError(
        error.message.includes("duplicate") || error.message.includes("unique")
          ? "Email này đã có trong danh sách rồi."
          : error.message
      );
      return;
    }
    setMode("list");
    loadUsers();
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(`Xoá "${item.full_name}" (${item.email}) khỏi danh sách?`);
    if (!confirmed) return;
    const { error } = await supabase.from("allowed_users").delete().eq("id", item.id);
    if (error) {
      alert("Xoá thất bại: " + error.message);
      return;
    }
    loadUsers();
  }

  if (status === "loading") {
    return (
      <div className="card">
        <p>Đang tải danh sách...</p>
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
      <div className="card" style={{ maxWidth: 500 }}>
        <div className="eyebrow">Quản lý người dùng</div>
        <h2>{form.id ? "Sửa thông tin" : "Thêm người mới"}</h2>

        <form onSubmit={handleSave}>
          {saveError && <div className="error-box">{saveError}</div>}

          <label>Họ và tên</label>
          <input
            className="field"
            type="text"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            placeholder="Ví dụ: Nguyễn Văn Đức"
          />

          <label>Email cá nhân</label>
          <input
            className="field"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="ten@gmail.com"
          />

          <div className="link-row">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
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
    <div className="card" style={{ maxWidth: 900 }}>
      <div className="eyebrow">Quản lý người dùng</div>
      <h1>Danh sách được phép làm bài ({users.length} người)</h1>
      <p>
        Chỉ những email có trong danh sách này mới làm bài được. Thêm người mới ở đây khi có
        nhân sự mới, không cần chỉnh sửa database.
      </p>

      <input
        className="field"
        type="text"
        placeholder="Tìm theo tên hoặc email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -8, marginBottom: 18 }}>
        <button className="btn-primary" onClick={openCreate}>
          + Thêm người
        </button>
      </div>

      <div
        style={{
          maxHeight: 560,
          overflowY: "auto",
          border: "1px solid var(--panel-border)",
          borderRadius: 10,
        }}
      >
        <table style={{ marginTop: 0 }}>
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Email</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>{item.full_name}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{item.email}</td>
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
          <p style={{ padding: 16, textAlign: "center" }}>Không tìm thấy ai khớp.</p>
        )}
      </div>

      <div className="link-row">
        <a href="/">
          <button className="btn-secondary">← Trang chủ</button>
        </a>
        <a href="/admin-questions">
          <button className="btn-secondary">Quản lý câu hỏi</button>
        </a>
      </div>
    </div>
  );
}
