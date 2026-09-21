"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { getQuizWindowStatus, formatWindowMessage } from "../lib/quizWindow";
import { getCurrentPeriod, formatPeriodLabel } from "../lib/period";
import { getLocalSettings, fetchServerSettings } from "../lib/settings";
import {
  Users,
  Search,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Award,
  BookOpen,
  LayoutDashboard,
  ClipboardList,
  History,
  ListChecks,
  ShieldCheck,
  FileText,
  Clock,
  Settings,
  Mail,
  AlertCircle,
} from "lucide-react";

export default function Home() {
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [inputEmail, setInputEmail] = useState("");
  const [showList, setShowList] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [windowStatus, setWindowStatus] = useState({ open: true });
  const [settings, setSettings] = useState(getLocalSettings());

  const boxRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    // 1. Tải settings
    fetchServerSettings().then((cfg) => {
      if (cfg) {
        setSettings(cfg);
        setWindowStatus(getQuizWindowStatus());
      }
    });

    // 2. Tải danh sách nhân sự
    async function loadUsers() {
      setLoadingUsers(true);
      const { data, error: err } = await supabase
        .from("allowed_users")
        .select("id, full_name, email")
        .order("full_name", { ascending: true });

      if (err) {
        console.error("Lỗi tải nhân sự:", err);
      } else {
        setAllUsers(data || []);
      }
      setLoadingUsers(false);
    }
    loadUsers();

    setWindowStatus(getQuizWindowStatus());

    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setShowList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setInputEmail("");
    setShowList(true);
  }

  async function handleStart(e) {
    e.preventDefault();
    setError("");

    if (!selected) {
      setError(
        "Vui lòng chọn đúng họ và tên của bạn trong danh sách nhân sự Đội ĐNCT."
      );
      return;
    }

    // Yêu cầu 2: Xác thực email người làm bài khớp với email đã được lưu trước đó
    if (settings.requireEmailVerification !== false) {
      if (!inputEmail.trim()) {
        setError("Vui lòng nhập địa chỉ email của bạn để xác thực danh tính.");
        return;
      }
      const normalizedInput = inputEmail.trim().toLowerCase();
      const normalizedSaved = (selected.email || "").trim().toLowerCase();

      if (normalizedInput !== normalizedSaved) {
        setError(
          `Địa chỉ email nhập vào không khớp với email đã lưu trong hồ sơ của nhân sự "${selected.full_name}". Vui lòng kiểm tra lại hoặc liên hệ Quản lý Đội ĐNCT.`
        );
        return;
      }
    }

    const currentStatus = getQuizWindowStatus();
    if (!currentStatus.open) {
      setError(formatWindowMessage(currentStatus));
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
        `Bạn đã hoàn thành bài thi của kỳ ${formatPeriodLabel(getCurrentPeriod())} (Đạt ${prev.score}/${prev.total} điểm). Mỗi nhân sự chỉ thực hiện 1 lần trong kỳ (Nếu cần làm lại, vui lòng liên hệ Quản trị viên để được xóa kết quả).`
      );
      return;
    }

    localStorage.setItem("quiz_user_name", selected.full_name);
    localStorage.setItem("quiz_user_email", selected.email);
    router.push("/quiz");
  }

  return (
    <div className="card" style={{ maxWidth: 680 }}>
      {/* Header thương hiệu AHT & Kỳ thi */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
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

      <h1 style={{ fontSize: 25, fontWeight: 800, marginBottom: 8, color: "#ffffff" }}>
        Kiểm tra Kiến thức Chuyên môn Định kỳ
      </h1>
      
      <p style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 16 }}>
        Mỗi lượt làm bài gồm <strong>{settings.questionsCount || 25} câu hỏi</strong> trắc nghiệm kỹ thuật, thời gian làm bài <strong>{settings.quizDurationMinutes || 30} phút</strong>. Hệ thống tự động chấm điểm và đánh giá năng lực theo tiêu chuẩn AHT.
      </p>

      {/* Thông báo tình trạng khung giờ thi */}
      {!windowStatus.open ? (
        <div className="error-box" style={{ marginBottom: 18 }}>
          <AlertCircle size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
          {formatWindowMessage(windowStatus)}
        </div>
      ) : (
        <div
          style={{
            background: "rgba(56, 189, 248, 0.07)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            borderRadius: 8,
            padding: "8px 14px",
            marginBottom: 18,
            fontSize: 12.5,
            color: "#7dd3fc",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Clock size={15} />
          <span>
            {settings.enableDailyHours
              ? `Hệ thống đang mở thi (Mở từ ngày ${settings.monthlyOpenDay} - ${settings.monthlyCloseDay}, khung giờ hôm nay: ${settings.dailyOpenTime} - ${settings.dailyCloseTime}).`
              : `Hệ thống đang mở bài thi định kỳ từ ngày ${settings.monthlyOpenDay} đến hết ngày ${settings.monthlyCloseDay} tháng này.`}
          </span>
        </div>
      )}

      {/* Form đăng nhập 2 bước: Chọn Tên + Nhập Email xác thực (Yêu cầu 2) */}
      <form onSubmit={handleStart} style={{ marginBottom: 24 }}>
        {error && <div className="error-box">{error}</div>}

        {/* Bước 1: Chọn Họ và tên nhân sự */}
        <label htmlFor="who" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13.5 }}>
            1. Chọn Họ và tên nhân sự:
          </span>
          {selected && (
            <span style={{ fontSize: 12, color: "var(--ok)", display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle2 size={13} /> Đã chọn nhân sự
            </span>
          )}
        </label>

        <div className="combobox" ref={boxRef} style={{ marginBottom: 14 }}>
          <div style={{ position: "relative" }}>
            <input
              id="who"
              className="field"
              style={{
                paddingLeft: 38,
                borderColor: selected ? "var(--ok)" : undefined,
                background: selected ? "rgba(16, 185, 129, 0.08)" : undefined,
                marginBottom: 0,
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

        {/* Bước 2: Nhập Email xác thực (Yêu cầu 2) */}
        {selected && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--panel-border)",
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 16,
            }}
          >
            <label htmlFor="authEmail" style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13.5, marginBottom: 6 }}>
              <Mail size={15} style={{ color: "var(--brand-cyan)" }} />
              2. Nhập địa chỉ Email của bạn để xác thực:
            </label>
            <input
              id="authEmail"
              type="email"
              className="field"
              style={{ margin: 0 }}
              placeholder="Nhập email của bạn (ví dụ: yourname@aht.com)..."
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              required
              autoFocus
            />
            <span style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6, display: "block" }}>
              Email này phải trùng khớp với địa chỉ email đã đăng ký của nhân sự <strong>{selected.full_name}</strong>.
            </span>
          </div>
        )}

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

      {/* Khu vực Luyện tập & Tra cứu */}
      <div className="nav-section-label">
        <BookOpen size={14} style={{ color: "var(--brand-cyan)" }} /> Luyện tập & Tra cứu cá nhân
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
              Luyện tập theo 15 chuyên đề kỹ thuật kèm giải thích chi tiết
            </div>
          </div>
        </a>
        <a href="/my-result" className="nav-tile">
          <span className="nav-tile-icon" style={{ color: "var(--amber)", background: "rgba(245, 158, 11, 0.15)" }}>
            <Award size={18} />
          </span>
          <span className="nav-tile-label">Tra cứu Điểm & Chứng nhận</span>
        </a>
        <a href="/guide" className="nav-tile">
          <span className="nav-tile-icon" style={{ color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)" }}>
            <FileText size={18} />
          </span>
          <span className="nav-tile-label">Quy chế & Hướng dẫn Thi</span>
        </a>
      </div>

      {/* Khu vực Quản lý & Báo cáo */}
      <div className="nav-section-label">
        <ShieldCheck size={14} style={{ color: "var(--amber)" }} /> Quản lý & Thống kê (Cần mã PIN)
      </div>
      <div className="nav-grid">
        <a href="/admin-settings" className="nav-tile featured" style={{ border: "1px solid rgba(56, 189, 248, 0.35)" }}>
          <span className="nav-tile-icon" style={{ color: "var(--brand-cyan)", background: "rgba(56, 189, 248, 0.15)" }}>
            <Settings size={18} />
          </span>
          <div style={{ textAlign: "left" }}>
            <span className="nav-tile-label" style={{ color: "#fff", fontWeight: 700 }}>
              Cài đặt Hệ thống & Bộ đề
            </span>
            <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 2 }}>
              Lịch thi, Khung giờ, 10 Bộ đề & Xóa kết quả thi lại
            </div>
          </div>
        </a>
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
