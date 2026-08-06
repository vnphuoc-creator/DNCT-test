"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import ScoreGauge from "../components/ScoreGauge";

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const COUNT_OPTIONS = [10, 25, 50];

export default function PracticePage() {
  const [status, setStatus] = useState("loading"); // loading | error | setup | playing | finished
  const [errorMsg, setErrorMsg] = useState("");
  const [allQuestions, setAllQuestions] = useState([]);
  const [category, setCategory] = useState("all");
  const [count, setCount] = useState(25);

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    loadAllQuestions();
  }, []);

  async function loadAllQuestions() {
    const { data, error } = await supabase.from("questions").select("*");
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }
    if (!data || data.length === 0) {
      setErrorMsg("Chưa có câu hỏi nào trong ngân hàng câu hỏi.");
      setStatus("error");
      return;
    }
    setAllQuestions(data);
    setStatus("setup");
  }

  const categories = useMemo(() => {
    const set = new Set(allQuestions.map((q) => q.category).filter(Boolean));
    return Array.from(set).sort();
  }, [allQuestions]);

  const filteredCount = useMemo(() => {
    if (category === "all") return allQuestions.length;
    return allQuestions.filter((q) => q.category === category).length;
  }, [allQuestions, category]);

  function handleStartPractice() {
    const pool =
      category === "all" ? allQuestions : allQuestions.filter((q) => q.category === category);
    const picked = shuffle(pool).slice(0, Math.min(count, pool.length));
    setQuestions(picked);
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setStatus("playing");
  }

  function handleSelect(index) {
    if (selected !== null) return;
    setSelected(index);
    const q = questions[current];
    if (index === q.correct_index) setScore((s) => s + 1);
  }

  function handleNext() {
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
      setSelected(null);
    } else {
      setStatus("finished");
    }
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

  if (status === "setup") {
    return (
      <div className="card">
        <div className="eyebrow">Ôn tập</div>
        <h1>Ôn tập trước khi thi thật</h1>
        <p>
          Làm bao nhiêu lần cũng được, hiện đáp án và giải thích ngay sau mỗi câu. Không tính vào
          báo cáo, không giới hạn số lần.
        </p>

        <label htmlFor="category">Chủ đề</label>
        <select
          id="category"
          className="field"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">Tất cả chủ đề ({allQuestions.length} câu)</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label htmlFor="count">Số câu muốn ôn</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              className={count === n ? "btn-primary" : "btn-secondary"}
              style={{ flex: 1 }}
              onClick={() => setCount(n)}
            >
              {n} câu
            </button>
          ))}
          <button
            type="button"
            className={count === filteredCount ? "btn-primary" : "btn-secondary"}
            style={{ flex: 1 }}
            onClick={() => setCount(filteredCount)}
          >
            Tất cả ({filteredCount})
          </button>
        </div>

        <button className="btn-primary" onClick={handleStartPractice}>
          Bắt đầu ôn tập
        </button>

        <div className="link-row">
          <a href="/">← Trang chủ</a>
        </div>
      </div>
    );
  }

  if (status === "finished") {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <div className="card">
        <div className="eyebrow">Ôn tập</div>
        <h2>Ôn tập xong!</h2>
        <ScoreGauge percent={percent} label={`${score}/${questions.length} CÂU ĐÚNG`} />
        <p>Kết quả này không được lưu lại, chỉ để bạn tự luyện tập.</p>
        <div className="link-row">
          <button className="btn-secondary" onClick={() => setStatus("setup")}>
            Ôn tập tiếp
          </button>
          <a href="/">
            <button className="btn-primary">Về trang chủ</button>
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
        Ôn tập · Câu {current + 1}/{questions.length}
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
          <button key={i} className={className} onClick={() => handleSelect(i)}>
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
        disabled={selected === null}
        onClick={handleNext}
        style={{ marginTop: 12 }}
      >
        {current + 1 < questions.length ? "Câu tiếp theo" : "Xem kết quả"}
      </button>
    </div>
  );
}
