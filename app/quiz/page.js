"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getQuizWindowStatus, formatWindowMessage } from "../../lib/quizWindow";
import { getCurrentPeriod, formatPeriodLabel } from "../../lib/period";
import { getLocalSettings, fetchServerSettings } from "../../lib/settings";
import { getLocalExamSets, selectQuestionsForSet } from "../../lib/examSets";
import ScoreGauge from "../components/ScoreGauge";
import { Clock, AlertTriangle, CheckCircle2, Award, ArrowRight } from "lucide-react";

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Bốc câu hỏi chia đều các chủ đề (hệ)
function pickEvenlyAcrossCategories(allQuestions, count) {
  const byCategory = {};
  for (const q of allQuestions) {
    const key = q.category || "Khác";
    if (!byCategory[key]) byCategory[key] = [];
    byCategory[key].push(q);
  }
  const categoryKeys = shuffle(Object.keys(byCategory));
  const shuffledGroups = categoryKeys.map((key) => shuffle(byCategory[key]));

  const picked = [];
  let round = 0;
  while (picked.length < count) {
    let addedThisRound = false;
    for (const group of shuffledGroups) {
      if (picked.length >= count) break;
      if (group[round]) {
        picked.push(group[round]);
        addedThisRound = true;
      }
    }
    if (!addedThisRound) break;
    round += 1;
  }
  return shuffle(picked);
}

const CONGRATS_MESSAGES = [
  "Xuất sắc! Bạn nắm kiến thức rất chắc, cứ giữ phong độ này nhé! 🎉",
  "Làm tốt lắm! Kết quả này cho thấy bạn đã ôn tập rất kỹ. 👏",
  "Tuyệt vời! Chúc mừng bạn đã hoàn thành bài test với kết quả rất tốt. 🎉",
];

const ENCOURAGE_MESSAGES = [
  "Cũng ổn rồi, cứ ôn lại những phần chưa chắc là lần sau sẽ tốt hơn nhiều. Bạn thử vào mục Ôn tập xem lại nhé! 💪",
  "Không sao cả, ai cũng có chỗ cần ôn thêm. Ghé qua mục Ôn tập luyện lại vài lần là chắc kiến thức ngay. 🙂",
  "Gần được rồi! Dành chút thời gian ôn lại các câu đã sai, lần sau bạn sẽ làm tốt hơn nhiều. 💪",
];

export default function QuizPage() {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [status, setStatus] = useState("loading"); // loading | error | playing | finished
  const [errorMsg, setErrorMsg] = useState("");
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [userAnswers, setUserAnswers] = useState([]);
  const [settings, setSettings] = useState(getLocalSettings());

  // Đồng hồ đếm ngược thời gian làm bài
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(30 * 60);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const savedName = localStorage.getItem("quiz_user_name");
    const savedEmail = localStorage.getItem("quiz_user_email");
    if (!savedName || !savedEmail) {
      window.location.href = "/";
      return;
    }

    setUserName(savedName);
    setUserEmail(savedEmail);

    // Tải cấu hình hệ thống mới nhất
    fetchServerSettings().then((cfg) => {
      const activeCfg = cfg || getLocalSettings();
      setSettings(activeCfg);

      const windowStatus = getQuizWindowStatus();
      if (!windowStatus.open) {
        setErrorMsg(formatWindowMessage(windowStatus));
        setStatus("error");
        return;
      }

      checkAlreadyTakenThenLoad(savedEmail, activeCfg);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function checkAlreadyTakenThenLoad(emailToCheck, cfg) {
    const { data, error } = await supabase
      .from("quiz_results")
      .select("id, score, total")
      .ilike("email", emailToCheck)
      .eq("period", getCurrentPeriod())
      .limit(1);

    if (error) {
      console.warn("Không kiểm tra được lịch sử thi:", error);
    } else if (data && data.length > 0) {
      setErrorMsg(
        `Bạn đã làm bài thi của kỳ ${formatPeriodLabel(getCurrentPeriod())} rồi (đạt ${data[0].score}/${data[0].total} điểm). Mỗi nhân sự chỉ được làm 1 lần mỗi kỳ. (Nếu cần thi lại, vui lòng liên hệ quản lý để được xóa bài).`
      );
      setStatus("error");
      return;
    }

    loadQuestions(cfg);
  }

  async function loadQuestions(cfg) {
    const targetCount = cfg.questionsCount || 25;
    const { data, error } = await supabase.from("questions").select("*");

    if (error) {
      setErrorMsg("Lỗi tải ngân hàng câu hỏi: " + error.message);
      setStatus("error");
      return;
    }

    if (!data || data.length === 0) {
      setErrorMsg("Chưa có câu hỏi nào trong ngân hàng câu hỏi. Vui lòng liên hệ quản lý.");
      setStatus("error");
      return;
    }

    let finalQuestions = [];

    // Chế độ chọn bộ đề (Yêu cầu 3)
    if (cfg.examMode === "selected_set") {
      const examSets = getLocalExamSets();
      const activeSet = examSets.find((s) => s.id === cfg.activeExamSetId) || examSets[0];
      finalQuestions = selectQuestionsForSet(data, activeSet, targetCount);
    } else {
      // Chế độ ngẫu nhiên chia đều hệ
      finalQuestions = pickEvenlyAcrossCategories(data, targetCount);
    }

    if (finalQuestions.length === 0) {
      finalQuestions = data.slice(0, targetCount);
    }

    setQuestions(finalQuestions);
    startTimeRef.current = Date.now();

    // Bắt đầu đếm ngược thời gian làm bài
    const durationMinutes = cfg.quizDurationMinutes || 30;
    const initialSeconds = durationMinutes * 60;
    setTimeLeftSeconds(initialSeconds);

    setStatus("playing");

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeOutAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // Tự động nộp bài khi hết giờ
  async function handleTimeOutAutoSubmit() {
    alert("Thời gian làm bài thi đã hết! Hệ thống sẽ tự động nộp bài của bạn.");
    await finishQuiz();
  }

  function handleSelect(index) {
    if (selected !== null) return;
    setSelected(index);
    const q = questions[current];
    const isCorrect = index === q.correct_index;
    if (isCorrect) {
      setScore((s) => s + 1);
    }
    setUserAnswers((prev) => [
      ...prev,
      {
        question_id: q.id,
        question_text: q.question_text,
        options: q.options,
        selected_index: index,
        correct_index: q.correct_index,
        is_correct: isCorrect,
      },
    ]);
  }

  async function handleNext() {
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
      setSelected(null);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      await finishQuiz();
    }
  }

  async function finishQuiz(finalScore, answers) {
    if (timerRef.current) clearInterval(timerRef.current);

    setSaving(true);
    const durationSeconds = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : null;

    const finalCalculatedScore = finalScore !== undefined ? finalScore : score;
    const finalAnswers = answers || userAnswers;

    const { error } = await supabase.from("quiz_results").insert({
      user_name: userName,
      email: userEmail,
      score: finalCalculatedScore,
      total: questions.length,
      answers: finalAnswers,
      duration_seconds: durationSeconds,
      period: getCurrentPeriod(),
    });

    setSaving(false);
    if (error) {
      console.error("Lỗi lưu kết quả thi:", error);
      setErrorMsg("Không thể lưu kết quả thi lên hệ thống: " + error.message);
    }

    const pct = questions.length > 0 ? Math.round((finalCalculatedScore / questions.length) * 100) : 0;
    const passThreshold = settings.passScorePercent || 80;
    const pool = pct >= passThreshold ? CONGRATS_MESSAGES : ENCOURAGE_MESSAGES;
    setResultMessage(pool[Math.floor(Math.random() * pool.length)]);
    setStatus("finished");
  }

  // Định dạng mm:ss cho đồng hồ đếm ngược
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  if (status === "loading") {
    return (
      <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ color: "var(--text-dim)" }}>Đang chuẩn bị đề thi cho bạn, vui lòng đợi giây lát...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="card">
        <div className="error-box" style={{ marginBottom: 16 }}>{errorMsg}</div>
        <a href="/">
          <button className="btn-secondary">← Quay lại trang chủ</button>
        </a>
      </div>
    );
  }

  if (status === "finished") {
    const percent = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const passThreshold = settings.passScorePercent || 80;
    const passed = percent >= passThreshold;

    return (
      <div className="card" style={{ maxWidth: 640 }}>
        <div className="eyebrow" style={{ color: "var(--brand-cyan)", fontWeight: 700 }}>
          KẾT QUẢ SÁT HẠCH ĐNCT
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: "6px 0 16px 0" }}>
          Hoàn thành bài thi, {userName}!
        </h2>
        {errorMsg && <div className="error-box">{errorMsg}</div>}

        <ScoreGauge
          percent={percent}
          label={`${score}/${questions.length} CÂU ĐÚNG`}
          passThreshold={passThreshold}
        />

        <div
          className="result-message"
          style={{
            textAlign: "center",
            padding: "14px 18px",
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 14.5,
            lineHeight: 1.6,
            background: passed ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.12)",
            border: `1px solid ${passed ? "rgba(16, 185, 129, 0.4)" : "rgba(244, 63, 94, 0.4)"}`,
            color: "var(--text)",
          }}
        >
          {resultMessage}
        </div>

        <div className="link-row" style={{ justifyContent: "center" }}>
          <a href="/practice">
            <button className="btn-secondary">Ôn tập thêm theo chuyên đề</button>
          </a>
          <a href="/my-result">
            <button className="btn-primary">Xem chứng nhận cá nhân</button>
          </a>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const isLastQuestion = current + 1 === questions.length;
  const isUrgentTime = timeLeftSeconds < 180; // dưới 3 phút

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      {/* Header thanh tiến độ + Đồng hồ đếm ngược */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div className="eyebrow" style={{ margin: 0, fontWeight: 700 }}>
          Câu {current + 1} / {questions.length} • {q.category || "Hệ thống ĐNCT"}
        </div>

        {/* Đồng hồ đếm ngược thời gian làm bài */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 8,
            background: isUrgentTime ? "rgba(244, 63, 94, 0.18)" : "rgba(255, 255, 255, 0.05)",
            border: `1px solid ${isUrgentTime ? "rgba(244, 63, 94, 0.5)" : "var(--panel-border)"}`,
            color: isUrgentTime ? "#f43f5e" : "var(--brand-cyan)",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          <Clock size={16} className={isUrgentTime ? "animate-pulse" : ""} />
          <span>{formatTime(timeLeftSeconds)}</span>
        </div>
      </div>

      <div className="progress-track" style={{ marginBottom: 18 }}>
        <div
          className="progress-fill"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5, margin: "0 0 16px 0" }}>
        {q.question_text}
      </h2>

      {q.image_url && (
        <img
          src={q.image_url}
          alt="Ảnh minh họa"
          className="question-image"
          style={{ maxHeight: 280, objectFit: "contain", borderRadius: 8, marginBottom: 16 }}
        />
      )}

      {/* Danh sách lựa chọn A, B, C, D */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "16px 0" }}>
        {q.options.map((opt, i) => {
          let className = "option";
          if (selected !== null) {
            if (i === q.correct_index) className += " correct";
            else if (i === selected) className += " wrong";
          }
          const letter = String.fromCharCode(65 + i);

          return (
            <button
              key={i}
              className={className}
              onClick={() => handleSelect(i)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                textAlign: "left",
                padding: "12px 16px",
                width: "100%",
                borderRadius: 8,
                margin: 0,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: "rgba(255, 255, 255, 0.08)",
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {letter}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.5, marginTop: 2 }}>{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Giải thích sau khi chọn */}
      {selected !== null && q.explanation && (
        <div
          style={{
            background: "rgba(56, 189, 248, 0.08)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: 8,
            padding: "12px 14px",
            fontSize: 13,
            color: "#bae6fd",
            margin: "16px 0",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "#38bdf8" }}>Giải thích kỹ thuật: </strong>
          {q.explanation}
        </div>
      )}

      {/* Nút chuyển câu */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
        <button
          type="button"
          className="btn-primary"
          style={{ minWidth: 140, height: 42, fontSize: 14 }}
          onClick={handleNext}
          disabled={selected === null || saving}
        >
          {saving ? (
            "Đang nộp bài..."
          ) : isLastQuestion ? (
            "Nộp bài thi"
          ) : (
            <>
              Câu tiếp theo <ArrowRight size={16} style={{ marginLeft: 6 }} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
