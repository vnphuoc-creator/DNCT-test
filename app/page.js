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
    setQuery(`${user.full_name} — ${user.email}`);
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
        "Chọn đúng tên bạn trong danh sách gợi ý. Không tìm thấy tên? Liên hệ người quản lý bài test để được thêm vào danh sách."
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
      setError("Không kiểm tra được, thử lại sau: " + fetchError.message);
      return;
    }

    if (data && data.length > 0) {
      const prev = data[0];
      setError(
        `Bạn đã làm bài của ${formatPeriodLabel(getCurrentPeriod())} rồi (đạt ${prev.score}/${prev.total} điểm). Mỗi người chỉ được làm 1 lần mỗi tháng.`
      );
      return;
    }

    localStorage.setItem("quiz_user_name", selected.full_name);
    localStorage.setItem("quiz_user_email", selected.email);
    router.push("/quiz");
  }

  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <div className="eyebrow">Bài Test Kiến Thức</div>
      <h1>Bạn hiểu bao nhiêu về chủ đề này?</h1>
      <p>
        Gõ tên hoặc email để tìm đúng bạn trong danh sách rồi bắt đầu. Mỗi lượt
        có 25 câu hỏi ngẫu nhiên, tự chấm điểm. Mỗi người chỉ được làm{" "}
        <strong>1 lần mỗi tháng</strong>.
      </p>

      {!windowStatus.open && (
        <div className="error-box">{formatWindowMessage(windowStatus)}</div>
      )}

      <form onSubmit={handleStart}>
        {error && <div className="error-box">{error}</div>}

        <label htmlFor="who">Tên hoặc email của bạn</label>
        <div className="combobox" ref={boxRef}>
          <input
            id="who"
            className="field"
            style={{ marginBottom: showList && matches.length > 0 ? 0 : 18 }}
            type="text"
            autoComplete="off"
            placeholder={loadingUsers ? "Đang tải danh sách..." : "Gõ để tìm tên..."}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setShowList(true)}
            disabled={!windowStatus.open || loadingUsers}
          />
          {showList && query.trim() && matches.length > 0 && (
            <div className="combobox-list">
              {matches.map((u) => (
                <div key={u.id} className="combobox-item" onClick={() => handlePick(u)}>
                  {u.full_name}
                  <span className="email">{u.email}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {showList && query.trim() && matches.length > 0 && <div style={{ height: 18 }} />}

        <button
          type="submit"
          className="btn-primary"
          disabled={checking || !windowStatus.open || loadingUsers}
        >
          {checking ? "Đang kiểm tra..." : "Bắt đầu làm bài"}
        </button>
      </form>

      <div className="nav-section-label">Luyện tập</div>
      <div className="nav-grid">
        <a href="/practice" className="nav-tile featured">
          <span className="nav-tile-icon">
            <BookOpen size={18} />
          </span>
          <span className="nav-tile-label">Ôn tập trước khi thi</span>
        </a>
      </div>

      <div className="nav-section-label">Khu vực quản trị (cần mật khẩu)</div>
      <div className="nav-grid">
        <a href="/results" className="nav-tile">
          <span className="nav-tile-icon">
            <History size={18} />
          </span>
          <span className="nav-tile-label">Lịch sử kết quả</span>
        </a>
        <a href="/report" className="nav-tile">
          <span className="nav-tile-icon">
            <ClipboardList size={18} />
          </span>
          <span className="nav-tile-label">Báo cáo tổng hợp</span>
        </a>
        <a href="/dashboard" className="nav-tile">
          <span className="nav-tile-icon">
            <LayoutDashboard size={18} />
          </span>
          <span className="nav-tile-label">Dashboard</span>
        </a>
        <a href="/admin-questions" className="nav-tile">
          <span className="nav-tile-icon">
            <ListChecks size={18} />
          </span>
          <span className="nav-tile-label">Quản lý câu hỏi</span>
        </a>
        <a href="/admin-users" className="nav-tile">
          <span className="nav-tile-icon">
            <Users size={18} />
          </span>
          <span className="nav-tile-label">Quản lý người dùng</span>
        </a>
      </div>
    </div>
  );
}
