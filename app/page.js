"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { getQuizWindowStatus, formatVNDateTime } from "../lib/quizWindow";
import { getCurrentPeriod, formatPeriodLabel } from "../lib/period";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function HomePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [windowStatus, setWindowStatus] = useState({ open: true, reason: null });
  const router = useRouter();

  useEffect(() => {
    setWindowStatus(getQuizWindowStatus());
  }, []);

  async function handleStart(e) {
    e.preventDefault();
    setError("");
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError("Nhập tên của bạn trước khi bắt đầu nhé.");
      return;
    }
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setError("Nhập đúng định dạng email công ty (ví dụ: ten@congty.com).");
      return;
    }

    const status = getQuizWindowStatus();
    if (!status.open) {
      setError(
        status.reason === "not_started"
          ? `Bài test chưa mở. Vui lòng quay lại sau lúc ${formatVNDateTime(status.start)}.`
          : `Bài test đã kết thúc lúc ${formatVNDateTime(status.deadline)}, không thể làm bài nữa.`
      );
      return;
    }

    setChecking(true);
    const { data, error: fetchError } = await supabase
      .from("quiz_results")
      .select("id, score, total, created_at")
      .ilike("email", trimmedEmail)
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
        `Email "${trimmedEmail}" đã làm bài của ${formatPeriodLabel(getCurrentPeriod())} rồi (đạt ${prev.score}/${prev.total} điểm). Mỗi email chỉ được làm 1 lần mỗi tháng. Nếu đây là nhầm lẫn, liên hệ người quản lý bài test.`
      );
      return;
    }

    localStorage.setItem("quiz_user_name", trimmedName);
    localStorage.setItem("quiz_user_email", trimmedEmail);
    router.push("/quiz");
  }

  return (
    <div className="card">
      <div className="eyebrow">Bài Test Kiến Thức</div>
      <h1>Bạn hiểu bao nhiêu về chủ đề này?</h1>
      <p>
        Nhập tên và email công ty để bắt đầu. Mỗi lượt sẽ có 25 câu hỏi ngẫu
        nhiên, hệ thống tự chấm điểm và lưu lại kết quả của bạn. Mỗi{" "}
        <strong>email</strong> chỉ được làm <strong>1 lần mỗi tháng</strong>.
      </p>

      {!windowStatus.open && (
        <div className="error-box">
          {windowStatus.reason === "not_started"
            ? `Bài test chưa mở. Sẽ mở lúc ${formatVNDateTime(windowStatus.start)}.`
            : `Bài test đã kết thúc lúc ${formatVNDateTime(windowStatus.deadline)}.`}
        </div>
      )}

      <form onSubmit={handleStart}>
        {error && <div className="error-box">{error}</div>}

        <label htmlFor="name">Tên của bạn</label>
        <input
          id="name"
          className="field"
          type="text"
          placeholder="Ví dụ: Minh Anh"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!windowStatus.open}
        />

        <label htmlFor="email">Email công ty</label>
        <input
          id="email"
          className="field"
          type="email"
          placeholder="ten@congty.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!windowStatus.open}
        />

        <button
          type="submit"
          className="btn-primary"
          disabled={checking || !windowStatus.open}
        >
          {checking ? "Đang kiểm tra..." : "Bắt đầu làm bài"}
        </button>
      </form>

      <div className="link-row">
        <a href="/practice">Ôn tập trước khi thi →</a>
      </div>

      <div className="link-row">
        <a href="/results">Xem lịch sử kết quả →</a>
        <a href="/report">Xem báo cáo tổng hợp →</a>
        <a href="/dashboard">Xem dashboard →</a>
        <a href="/admin-questions">Quản lý câu hỏi →</a>
      </div>
    </div>
  );
}
