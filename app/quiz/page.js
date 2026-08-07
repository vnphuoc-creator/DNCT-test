"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getQuizWindowStatus, formatWindowMessage } from "../../lib/quizWindow";
import { getCurrentPeriod, formatPeriodLabel } from "../../lib/period";
import ScoreGauge from "../components/ScoreGauge";

// Số câu hỏi ngẫu nhiên cho mỗi lượt làm bài (đổi số này nếu muốn nhiều/ít hơn)
const QUESTIONS_PER_QUIZ = 25;

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Bốc câu hỏi CHIA ĐỀU theo từng chủ đề (category), thay vì random thuần —
// tránh việc hệ nào có nhiều câu trong kho sẽ chiếm phần lớn bài test.
// Cách làm: trộn ngẫu nhiên câu hỏi trong từng chủ đề, rồi lấy lần lượt
// "vòng tròn" mỗi chủ đề 1 câu cho tới khi đủ số lượng cần thiết.
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
    if (!addedThisRound) break; // hết sạch câu hỏi ở mọi chủ đề
    round += 1;
  }
  return shuffle(picked); // trộn lại thứ tự cuối cùng để không lộ theo nhóm
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
  const [userAnswers, setUserAnswers] = useState([]);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const savedName = localStorage.getItem("quiz_user_name");
    const savedEmail = localStorage.getItem("quiz_user_email");
    if (!savedName || !savedEmail) {
      window.location.href = "/";
      return;
    }

    const windowStatus = getQuizWindowStatus();
    if (!windowStatus.open) {
      setErrorMsg(formatWindowMessage(windowStatus));
      setStatus("error");
      return;
    }

    setUserName(savedName);
    setUserEmail(savedEmail);
    checkAlreadyTakenThenLoad(savedEmail);
  }, []);

  async function checkAlreadyTakenThenLoad(emailToCheck) {
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
    loadQuestions();
  }

  async function loadQuestions() {
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
    setQuestions(pickEvenlyAcrossCategories(data, QUESTIONS_PER_QUIZ));
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

  async function finishQuiz() {
    setSaving(true);
    const durationSeconds = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : null;
    const { error } = await supabase.from("quiz_results").insert({
      user_name: userName,
      email: userEmail,
      score,
      total: questions.length,
      answers: userAnswers,
      duration_seconds: durationSeconds,
      period: getCurrentPeriod(),
    });
    setSaving(false);
    if (error) {
      setErrorMsg(
        "Đã chấm điểm xong nhưng lưu kết quả bị lỗi: " + error.message
      );
    }
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
    return (
      <div className="card">
        <div className="eyebrow">Kết quả</div>
        <h2>Xong rồi, {userName}!</h2>
        {errorMsg && <div className="error-box">{errorMsg}</div>}
        <ScoreGauge percent={percent} label={`${score}/${questions.length} CÂU ĐÚNG`} />
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

      {q.options.map((opt, i) => {
        let className = "option";
        if (selected !== null) {
          if (i === q.correct_index) className += " correct";
          else if (i === selected) className += " wrong";
        }
        return (
          <button
            key={i}
            className={className}
            onClick={() => handleSelect(i)}
          >
            {opt}
          </button>
        );
      })}

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
