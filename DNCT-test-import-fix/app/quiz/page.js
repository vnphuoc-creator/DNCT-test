"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getQuizWindowStatus, formatWindowMessage } from "../../lib/quizWindow";
import { getSettings } from "../../lib/settings";
import { getCurrentPeriod, formatPeriodLabel } from "../../lib/period";
import { shuffle, pickEvenlyAcrossCategories } from "../../lib/quizPicker";
import ScoreGauge from "../components/ScoreGauge";

// Giá trị mặc định dự phòng — có thể ghi đè động qua trang Cài đặt (app_settings)

const DEFAULT_QUESTIONS_PER_QUIZ = 25;
const DEFAULT_PASS_THRESHOLD = 80;

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

function getResultMessage(percent, threshold) {
  const pool = percent >= threshold ? CONGRATS_MESSAGES : ENCOURAGE_MESSAGES;
  return pool[Math.floor(Math.random() * pool.length)];
}

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
  const [questionsPerQuiz, setQuestionsPerQuiz] = useState(DEFAULT_QUESTIONS_PER_QUIZ);
  const [passThreshold, setPassThreshold] = useState(DEFAULT_PASS_THRESHOLD);
  const [userAnswers, setUserAnswers] = useState([]);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const savedName = localStorage.getItem("quiz_user_name");
    const savedEmail = localStorage.getItem("quiz_user_email");
    if (!savedName || !savedEmail) {
      window.location.href = "/";
      return;
    }

    async function init() {
      const [windowStatus, settings] = await Promise.all([getQuizWindowStatus(), getSettings()]);
      if (!windowStatus.open) {
        setErrorMsg(formatWindowMessage(windowStatus));
        setStatus("error");
        return;
      }

      if (settings.quiz_questions_count) {
        setQuestionsPerQuiz(parseInt(settings.quiz_questions_count, 10) || DEFAULT_QUESTIONS_PER_QUIZ);
      }
      if (settings.quiz_pass_threshold) {
        setPassThreshold(parseInt(settings.quiz_pass_threshold, 10) || DEFAULT_PASS_THRESHOLD);
      }

      setUserName(savedName);
      setUserEmail(savedEmail);
      checkAlreadyTakenThenLoad(
        savedEmail,
        parseInt(settings.quiz_questions_count, 10) || DEFAULT_QUESTIONS_PER_QUIZ,
        settings
      );
    }
    init();
  }, []);

  async function checkAlreadyTakenThenLoad(emailToCheck, questionsCount, settings) {
    const { data, error } = await supabase
      .from("quiz_results")
      .select("id, score, total")
      .ilike("email", emailToCheck)
      .eq("period", getCurrentPeriod())
      .limit(1);

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }
    if (data && data.length > 0) {
      setErrorMsg(
        `Bạn đã làm bài của ${formatPeriodLabel(getCurrentPeriod())} rồi (đạt ${data[0].score}/${data[0].total} điểm). Mỗi email chỉ được làm 1 lần mỗi tháng.`
      );
      setStatus("error");
      return;
    }
    loadQuestions(questionsCount, settings);
  }

  async function loadQuestions(questionsCount, settings) {
    // Chế độ "bộ đề cố định": mọi người làm chung đúng bộ câu hỏi admin đã chọn sẵn,
    // thay vì mỗi người 1 đề random riêng.
    if (settings && settings.quiz_mode === "fixed_set" && settings.quiz_active_set_id) {
      const { data: setRow, error: setError } = await supabase
        .from("question_sets")
        .select("question_ids")
        .eq("id", settings.quiz_active_set_id)
        .single();

      if (setError || !setRow) {
        setErrorMsg(
          "Không tải được bộ đề cố định đã chọn: " + (setError?.message || "không tìm thấy bộ đề.")
        );
        setStatus("error");
        return;
      }

      const ids = setRow.question_ids || [];
      const { data: setQuestions, error: qError } = await supabase
        .from("questions")
        .select("*")
        .in("id", ids);

      if (qError) {
        setErrorMsg(qError.message);
        setStatus("error");
        return;
      }
      if (!setQuestions || setQuestions.length === 0) {
        setErrorMsg("Bộ đề cố định đang chọn không còn câu hỏi nào hợp lệ.");
        setStatus("error");
        return;
      }
      setQuestions(shuffle(setQuestions));
      startTimeRef.current = Date.now();
      setStatus("playing");
      return;
    }

    const { data, error } = await supabase.from("questions").select("*");

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }
    if (!data || data.length === 0) {
      setErrorMsg(
        "Chưa có câu hỏi nào trong bảng 'questions'. Hãy thêm câu hỏi trong Supabase trước."
      );
      setStatus("error");
      return;
    }
    setQuestions(pickEvenlyAcrossCategories(data, questionsCount));
    startTimeRef.current = Date.now();
    setStatus("playing");
  }

  function handleSelect(index) {
    if (selected !== null) return; // đã chọn rồi thì khoá lại
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
      await finishQuiz();
    }
  }

  async function finishQuiz(finalScore, answers) {
    const windowStatus = await getQuizWindowStatus();
    if (!windowStatus.open) {
      setErrorMsg(
        "Kỳ thi hiện tại đang đóng (" +
          formatWindowMessage(windowStatus) +
          "). Kết quả không được ghi nhận."
      );
      setStatus("error");
      return;
    }

    setSaving(true);
    const durationSeconds = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : null;
    const { error } = await supabase.from("quiz_results").insert({
      user_name: userName,
      email: userEmail,
      score: finalScore !== undefined ? finalScore : score,
      total: questions.length,
      answers: answers || userAnswers,
      duration_seconds: durationSeconds,
      period: getCurrentPeriod(),
    });
    setSaving(false);
    if (error) {
      setErrorMsg(
        "Đã chấm điểm xong nhưng lưu kết quả bị lỗi: " + error.message
      );
    }
    const finalPercent = Math.round((score / questions.length) * 100);
    setResultMessage(getResultMessage(finalPercent, passThreshold));
    setStatus("finished");
  }

  if (status === "loading") {
    return (
      <div className="card">
        <p>Đang tải câu hỏi...</p>
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

  if (status === "finished") {
    const percent = Math.round((score / questions.length) * 100);
    const passed = percent >= passThreshold;
    return (
      <div className="card">
        <div className="eyebrow">Kết quả</div>
        <h2>Xong rồi, {userName}!</h2>
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
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 18,
            fontSize: 15,
            lineHeight: 1.6,
            background: passed ? "var(--ok-glow)" : "var(--amber-glow)",
            border: `1px solid ${passed ? "var(--ok)" : "var(--amber-dim)"}`,
            color: "var(--text)",
          }}
        >
          {resultMessage}
        </div>
        <div className="link-row">
          <a href="/practice">
            <button className="btn-secondary">Ôn tập thêm</button>
          </a>
          <a href="/results">
            <button className="btn-primary">Xem lịch sử</button>
          </a>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="card">
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>
      <div className="eyebrow">
        Câu {current + 1}/{questions.length}
      </div>
      <h2>{q.question_text}</h2>

      {q.image_url && (
        <img
          src={q.image_url}
          alt="Ảnh minh hoạ câu hỏi"
          className="question-image"
        />
      )}

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
                padding: "12px 14px",
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
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.12)",
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {letter}
              </span>
              <span style={{ flex: 1, fontSize: 15, lineHeight: 1.5 }}>{opt}</span>
            </button>
          );
        })}
      </div>

      {selected !== null && q.explanation && (
        <div
          style={{
            background: "#0d1620",
            border: "1px solid var(--panel-border)",
            borderRadius: 10,
            padding: "12px 14px",
            marginTop: 4,
            marginBottom: 16,
            fontSize: 14,
            color: "var(--text-dim)",
          }}
        >
          <strong style={{ color: "var(--amber)" }}>Giải thích: </strong>
          {q.explanation}
        </div>
      )}

      <button
        className="btn-primary"
        disabled={selected === null || saving}
        onClick={handleNext}
        style={{ marginTop: 12 }}
      >
        {saving
          ? "Đang lưu..."
          : current + 1 < questions.length
          ? "Câu tiếp theo"
          : "Nộp bài"}
      </button>
    </div>
  );
}
