"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { getQuizWindowStatus, formatWindowMessage } from "../lib/quizWindow";
import { getCurrentPeriod, formatPeriodLabel } from "../lib/period";
import {
  BookOpen,
  History,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  Users,
  Search,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function HomePage() {
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null); // { id, full_name, email }
  const [showList, setShowList] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [windowStatus, setWindowStatus] = useState({ open: true, reason: null });
  const router = useRouter();
  const boxRef = useRef(null);

  useEffect(() => {
    setWindowStatus(getQuizWindowStatus());
    loadUsers();

    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setShowList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadUsers() {
    setLoadingUsers(true);
    const { data, error: fetchError } = await supabase
      .from("allowed_users")
      .select("id, full_name, email")
      .order("full_name", { ascending: true });
    if (!fetchError) setAllUsers(data || []);
    setLoadingUsers(false);
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allUsers.slice(0, 8);
    return allUsers
      .filter(
        (u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [allUsers, query]);

  function handlePick(user) {
    setSelected(user);
    setQuery(user.full_name);
    setShowList(false);
    setError("");
  }

  function handleQueryChange(v) {
    setQuery(v);
    setSelected(null);
    setShowList(true);
  }

  async function handleStart(e) {
    e.preventDefault();
    setError("");

    if (!selected) {
      setError(
        "Vui lòng chọn đúng tên của bạn trong danh sách gợi ý. Nếu chưa có tên, vui lòng liên hệ quản lý Đội ĐNCT."
      );
      return;
    }

    const status = getQuizWindowStatus();
    if (!status.open) {
      setError(formatWindowMessage(status));
      return;
    }

    setChecking(true);
    const { data, error: fetchError } = await supabase
      .from("quiz_results")
      .select("id, score, total, created_at")
      .ilike("email", selected.email)
      .eq("period", getCurrentPeriod())
      .order("created_at", { ascending: false })
      .limit(1);

    setChecking(false);

    if (fetchError) {
      setError("Không kiểm tra được dữ liệu, vui lòng thử lại: " + fetchError.message);
      return;
    }

    if (data && data.length > 0) {
      const prev = data[0];
      setError(
        `Bạn đã hoàn thành bài thi của ${formatPeriodLabel(getCurrentPeriod())} (Đạt ${prev.score}/${prev.total} điểm). Mỗi nhân sự chỉ thực hiện 1 lần trong kỳ.`
      );
      return;
    }

    localStorage.setItem("quiz_user_name", selected.full_name);
    localStorage.setItem("quiz_user_email", selected.email);
    router.push("/quiz");
  }

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      {/* Header thương hiệu AHT & Kỳ thi */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div className="eyebrow" style={{ color: "var(--brand-cyan)", fontWeight: 700 }}>
          <Sparkles size={14} style={{ color: "var(--amber)" }} />
          HỆ THỐNG ĐÁNH GIÁ NĂNG LỰC KỸ THUẬT ĐNCT
        </div>
        <span
          className="badge badge-pass"
          style={{ fontSize: 11, padding: "4px 8px", background: "rgba(2, 132, 199, 0.2)", color: "var(--brand-cyan)", borderColor: "rgba(56, 189, 248, 0.4)" }}
        >
          {formatPeriodLabel(getCurrentPeriod())}
        </span>
      </div>

      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, color: "#ffffff" }}>
        Kiểm tra Kiến thức Chuyên môn Định kỳ
      </h1>
      
      <p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 20 }}>
        Mỗi lượt làm bài gồm <strong>25 câu hỏi</strong> trắc nghiệm kỹ thuật chọn ngẫu nhiên từ ngân hàng câu hỏi. Hệ thống tự động chấm điểm và đánh giá năng lực theo hệ thống.
      </p>

      {!windowStatus.open && (
        <div className="error-box">{formatWindowMessage(windowStatus)}</div>
      )}

      {/* Form nhập thông tin nhân sự */}
      <form onSubmit={handleStart} style={{ marginBottom: 24 }}>
        {error && <div className="error-box">{error}</div>}

        <label htmlFor="who" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Họ và tên hoặc Email nhân sự:</span>
          {selected && (
            <span style={{ fontSize: 12, color: "var(--ok)", display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle2 size={13} /> Đã xác thực
            </span>
          )}
        </label>

        <div className="combobox" ref={boxRef}>
          <div style={{ position: "relative" }}>
            <input
              id="who"
              className="field"
              style={{
                paddingLeft: 38,
                borderColor: selected ? "var(--ok)" : undefined,
                background: selected ? "rgba(16, 185, 129, 0.08)" : undefined,
                marginBottom: showList && matches.length > 0 ? 0 : 16,
              }}
              type="text"
              autoComplete="off"
              suppressHydrationWarning
              placeholder={loadingUsers ? "Đang tải danh sách nhân sự..." : "Nhập họ tên để tìm kiếm nhanh..."}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => setShowList(true)}
              disabled={!windowStatus.open || loadingUsers}
            />
            <Search
              size={18}
              style={{
                position: "absolute",
                left: 12,
                top: 13,
                color: selected ? "var(--ok)" : "var(--text-dim)",
                pointerEvents: "none",
              }}
            />
          </div>

          {showList && query.trim() && matches.length > 0 && (
            <div className="combobox-list">
              {matches.map((u) => (
                <div key={u.id} className="combobox-item" onClick={() => handlePick(u)}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <strong style={{ fontSize: 14, color: "#ffffff" }}>{u.full_name}</strong>
                    <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Mã NV: #{u.id}</span>
                  </div>
                  <span className="email">{u.email}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {showList && query.trim() && matches.length > 0 && <div style={{ height: 16 }} />}

        <button
          type="submit"
          className="btn-primary"
          style={{ height: 46, fontSize: 15 }}
          disabled={checking || !windowStatus.open || loadingUsers}
        >
          {checking ? (
            "Đang xác thực thông tin..."
          ) : (
            <>
              Bắt đầu làm bài thi chính thức <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* Khu vực Luyện tập */}
      <div className="nav-section-label">
        <BookOpen size={14} style={{ color: "var(--brand-cyan)" }} /> Luyện tập & Ôn thi
      </div>
      <div className="nav-grid">
        <a href="/practice" className="nav-tile featured">
          <div className="nav-tile-icon" style={{ background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", color: "#ffffff" }}>
            <BookOpen size={20} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div className="nav-tile-label" style={{ fontSize: 14, color: "#ffffff" }}>
              Ôn tập Kiến thức theo Từng Hệ thống
            </div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
              Luyện tập theo chuyên đề (Trung thế, Hạ thế, Máy phát, UPS, XLNT, 5S...) kèm giải thích
            </div>
          </div>
        </a>
      </div>

      {/* Khu vực Quản lý & Báo cáo */}
      <div className="nav-section-label">
        <ShieldCheck size={14} style={{ color: "var(--amber)" }} /> Quản lý & Thống kê (Cần mã PIN)
      </div>
      <div className="nav-grid">
        <a href="/dashboard" className="nav-tile">
          <span className="nav-tile-icon" style={{ color: "var(--amber)", background: "rgba(245, 158, 11, 0.15)" }}>
            <LayoutDashboard size={18} />
          </span>
          <span className="nav-tile-label">Dashboard Quản lý</span>
        </a>
        <a href="/report" className="nav-tile">
          <span className="nav-tile-icon" style={{ color: "var(--ok)", background: "rgba(16, 185, 129, 0.15)" }}>
            <ClipboardList size={18} />
          </span>
          <span className="nav-tile-label">Xuất Báo cáo Excel</span>
        </a>
        <a href="/results" className="nav-tile">
          <span className="nav-tile-icon" style={{ color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)" }}>
            <History size={18} />
          </span>
          <span className="nav-tile-label">Lịch sử Làm bài</span>
        </a>
        <a href="/admin-questions" className="nav-tile">
          <span className="nav-tile-icon" style={{ color: "#a855f7", background: "rgba(168, 85, 247, 0.15)" }}>
            <ListChecks size={18} />
          </span>
          <span className="nav-tile-label">Ngân hàng Câu hỏi</span>
        </a>
        <a href="/admin-users" className="nav-tile">
          <span className="nav-tile-icon" style={{ color: "#ec4899", background: "rgba(236, 72, 153, 0.15)" }}>
            <Users size={18} />
          </span>
          <span className="nav-tile-label">Danh sách Nhân sự</span>
        </a>
      </div>
    </div>
  );
}
