"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getQuizWindowStatus, formatVNDateTime } from "../../lib/quizWindow";

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

export default function QuizPage() {
  const [userName, setUserName] = useState("");
  const [status, setStatus] = useState("loading"); // loading | error | playing | finished
  const [errorMsg, setErrorMsg] = useState("");
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);

  useEffect(() => {
    const savedName = localStorage.getItem("quiz_user_name");
    if (!savedName) {
      window.location.href = "/";
      return;
    }

    const windowStatus = getQuizWindowStatus();
    if (!windowStatus.open) {
      setErrorMsg(
        windowStatus.reason === "not_started"
          ? `Bài test chưa mở. Sẽ mở lúc ${formatVNDateTime(windowStatus.start)}.`
          : `Bài test đã kết thúc lúc ${formatVNDateTime(windowStatus.deadline)}.`
      );
      setStatus("error");
      return;
    }

    setUserName(savedName);
    checkAlreadyTakenThenLoad(savedName);
  }, []);

  async function checkAlreadyTakenThenLoad(nameToCheck) {
    const { data, error } = await supabase
      .from("quiz_results")
      .select("id, score, total")
      .ilike("user_name", nameToCheck)
      .limit(1);

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }
    if (data && data.length > 0) {
      setErrorMsg(
        `Bạn đã làm bài rồi (đạt ${data[0].score}/${data[0].total} điểm). Mỗi người chỉ được làm 1 lần.`
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
    setQuestions(shuffle(data).slice(0, QUESTIONS_PER_QUIZ));
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
    const { error } = await supabase.from("quiz_results").insert({
      user_name: userName,
      score,
      total: questions.length,
      answers: userAnswers,
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
        <div className="result-score">
          {score}/{questions.length}
        </div>
        <p>Bạn đúng {percent}% số câu hỏi.</p>
        <div className="link-row">
          <a href="/quiz">
            <button className="btn-secondary">Làm lại</button>
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
