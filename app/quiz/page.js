"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Check,
  Send,
} from "lucide-react";
import {
  getSettings,
  saveExamResult,
  checkQuizAccess,
} from "@/lib/settings";
import { getExamSetById } from "@/lib/examSets";
import { getQuestionBank } from "@/lib/questions";

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSetId = searchParams.get("set");

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // answers: lưu các đáp án ĐÃ XÁC NHẬN { [câu_thứ_i]: đáp_án_chọn }
  const [answers, setAnswers] = useState({});

  // selectedOption: lưu đáp án đang tạm chọn ở câu hiện tại (chưa bấm nút xác nhận)
  const [selectedOption, setSelectedOption] = useState(null);

  // confirmToast: thông báo xác nhận thành công
  const [confirmToast, setConfirmToast] = useState("");

  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [isFinished, setIsFinished] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);
  const [examInfo, setExamInfo] = useState({ title: "Bài Test Kiến Thức Chuyên Môn Đội ĐNCT", code: "DE-THI" });

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalName, setModalName] = useState("");
  const [modalEmail, setModalEmail] = useState("");
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    let storedName = "";
    let storedEmail = "";
    if (typeof window !== "undefined") {
      storedName = localStorage.getItem("quiz_user_name") || "";
      storedEmail = localStorage.getItem("quiz_user_email") || "";
    }

    if (!storedName || !storedEmail) {
      setShowLoginModal(true);
      setLoading(false);
      return;
    }

    initQuiz(storedName, storedEmail);
  }, [requestedSetId]);

  const initQuiz = (name, email) => {
    setUserName(name);
    setUserEmail(email);
    setShowLoginModal(false);

    let settings = { examDurationMinutes: 15, questionsPerQuiz: 25, activePeriod: "Tháng 09/2026", passPercentage: 80 };
    try {
      settings = getSettings() || settings;
    } catch (e) {
      console.warn(e);
    }

    try {
      const access = checkQuizAccess(settings);
      if (access && !access.isOpen) {
        alert("Cổng làm bài hiện đang đóng: " + access.reason);
        router.replace("/");
        return;
      }
    } catch {}

    let allBank = [];
    try {
      allBank = getQuestionBank() || [];
    } catch {
      allBank = [];
    }

    let loadedQuestions = [];
    const targetSetId = requestedSetId || (settings.examMode === "set" ? settings.selectedExamSetId : null);

    if (targetSetId) {
      try {
        const examSet = getExamSetById(targetSetId);
        if (examSet && examSet.questionIds && examSet.questionIds.length > 0) {
          setExamInfo({ title: examSet.title || "Bộ đề thi", code: examSet.code || targetSetId });
          const map = new Map(allBank.map((q) => [q.id, q]));
          loadedQuestions = examSet.questionIds.map((id) => map.get(id)).filter(Boolean);
          if (examSet.timeMinutes) {
            setTimeLeft(examSet.timeMinutes * 60);
          }
        }
      } catch (err) {
        console.warn(err);
      }
    }

    if (loadedQuestions.length === 0) {
      setExamInfo({
        title: `Đề thi ngẫu nhiên Đợt ${settings.activePeriod || "Tháng 09/2026"}`,
        code: "DE-RANDOM",
      });

      const byCat = {};
      allBank.forEach((q) => {
        const c = q.category || "Hệ thống chung";
        if (!byCat[c]) byCat[c] = [];
        byCat[c].push(q);
      });

      const categories = Object.keys(byCat);
      const targetCount = settings.questionsPerQuiz || 25;
      const perCat = Math.max(1, Math.floor(targetCount / (categories.length || 1)));

      const selected = [];
      categories.forEach((cat) => {
        const pool = [...byCat[cat]].sort(() => 0.5 - Math.random());
        selected.push(...pool.slice(0, perCat));
      });

      if (selected.length < targetCount) {
        const remaining = allBank.filter((q) => !selected.some((s) => s.id === q.id));
        remaining.sort(() => 0.5 - Math.random());
        selected.push(...remaining.slice(0, targetCount - selected.length));
      }

      loadedQuestions = selected.slice(0, targetCount).sort(() => 0.5 - Math.random());
      setTimeLeft((settings.examDurationMinutes || 15) * 60);
    }

    setQuestions(loadedQuestions);
    setLoading(false);
  };

  // Đồng bộ lựa chọn khi người thi chuyển câu
  useEffect(() => {
    if (answers[currentIdx] !== undefined) {
      setSelectedOption(answers[currentIdx]);
    } else {
      setSelectedOption(null);
    }
    setConfirmToast("");
  }, [currentIdx, answers]);

  // Bộ đếm thời gian
  useEffect(() => {
    if (loading || isFinished || showLoginModal) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, isFinished, showLoginModal, questions, answers]);

  // Chọn tạm thời đáp án (người thi có thể click thay đổi qua lại giữa A, B, C, D tự do)
  const handlePickOption = (optIndex) => {
    if (isFinished) return;
    setSelectedOption(optIndex);
    setConfirmToast("");
  };

  // Nút XÁC NHẬN CHỌN CÂU TRẢ LỜI
  const handleConfirmAnswer = () => {
    if (selectedOption === null || selectedOption === undefined) {
      alert("Vui lòng nhấp chọn một đáp án (A, B, C hoặc D) trước khi bấm Xác nhận!");
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [currentIdx]: selectedOption,
    }));

    const letter = String.fromCharCode(65 + selectedOption);
    setConfirmToast(`✓ Đã xác nhận đáp án [${letter}] cho Câu ${currentIdx + 1}!`);

    setTimeout(() => {
      setConfirmToast("");
    }, 2500);
  };

  const handleNext = () => {
    if (selectedOption !== null && selectedOption !== undefined && answers[currentIdx] !== selectedOption) {
      setAnswers((prev) => ({
        ...prev,
        [currentIdx]: selectedOption,
      }));
    }
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (selectedOption !== null && selectedOption !== undefined && answers[currentIdx] !== selectedOption) {
      setAnswers((prev) => ({
        ...prev,
        [currentIdx]: selectedOption,
      }));
    }
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const handleJumpTo = (idx) => {
    if (selectedOption !== null && selectedOption !== undefined && answers[currentIdx] !== selectedOption) {
      setAnswers((prev) => ({
        ...prev,
        [currentIdx]: selectedOption,
      }));
    }
    setCurrentIdx(idx);
  };

  const handleSubmitQuiz = () => {
    if (isFinished) return;

    let finalAnswers = { ...answers };
    if (selectedOption !== null && selectedOption !== undefined) {
      finalAnswers[currentIdx] = selectedOption;
      setAnswers(finalAnswers);
    }

    let correct = 0;
    const details = [];

    questions.forEach((q, idx) => {
      const userAns = finalAnswers[idx];
      const correctAns = q.correctAnswer ?? q.correct_index ?? 0;
      const isCorrect = userAns !== undefined && userAns === correctAns;
      if (isCorrect) correct += 1;

      details.push({
        questionId: q.id,
        content: q.content || q.question_text,
        userAnswer: userAns,
        correctAnswer: correctAns,
        isCorrect,
        explanation: q.explanation || "",
        category: q.category || "Hệ thống chung",
      });
    });

    const total = questions.length || 25;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    const settings = getSettings();
    const isPass = percentage >= (settings.passPercentage || 80);

    const resultPayload = {
      fullName: userName,
      email: userEmail,
      score: correct,
      correctCount: correct,
      total,
      percentage,
      isPass,
      period: settings.activePeriod || "Tháng 09/2026",
      examCode: examInfo.code,
      examTitle: examInfo.title,
      answers: details,
      durationSeconds: (settings.examDurationMinutes || 15) * 60 - timeLeft,
    };

    try {
      saveExamResult(resultPayload);
    } catch (e) {
      console.warn(e);
    }

    setScoreResult(resultPayload);
    setIsFinished(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (showLoginModal) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: 540,
          background: "rgba(19, 27, 38, 0.96)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
          color: "#e2e8f0",
        }}
      >
        <div style={{ color: "#38bdf8", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Đội Nâng Chuyển Tải &bull; AHT
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
          Xác Nhận Thông Tin Thí Sinh
        </h1>
        <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
          Vui lòng nhập Họ tên và Email công việc để bắt đầu làm bài thi sát hạch.
        </p>

        {modalError && (
          <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: 8, padding: 12, color: "#fca5a5", fontSize: 13, marginBottom: 16 }}>
            {modalError}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!modalName.trim() || !modalEmail.trim()) {
              setModalError("Vui lòng nhập đầy đủ họ tên và email.");
              return;
            }
            if (typeof window !== "undefined") {
              localStorage.setItem("quiz_user_name", modalName.trim());
              localStorage.setItem("quiz_user_email", modalEmail.trim().toLowerCase());
            }
            initQuiz(modalName.trim(), modalEmail.trim().toLowerCase());
          }}
        >
          <label style={{ display: "block", fontSize: 12, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
            Họ và tên thí sinh
          </label>
          <input
            type="text"
            required
            placeholder="Ví dụ: Nguyễn Văn A"
            value={modalName}
            onChange={(e) => setModalName(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 8,
              color: "#fff",
              fontSize: 14,
              marginBottom: 16,
              outline: "none",
            }}
          />

          <label style={{ display: "block", fontSize: 12, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
            Email công việc
          </label>
          <input
            type="email"
            required
            placeholder="email@ahtcorp.vn hoặc email cá nhân"
            value={modalEmail}
            onChange={(e) => setModalEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 8,
              color: "#fff",
              fontSize: 14,
              marginBottom: 20,
              outline: "none",
            }}
          />

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "13px 20px",
              background: "#0284c7",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Bắt đầu làm bài thi
          </button>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: 680,
          background: "rgba(19, 27, 38, 0.95)",
          borderRadius: 16,
          padding: 48,
          textAlign: "center",
          color: "#94a3b8",
        }}
      >
        <p>Đang chuẩn bị đề thi chuyên môn...</p>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const totalQuestions = questions.length || 25;
  const progressPercent = Math.round(((currentIdx + 1) / totalQuestions) * 100);
  const confirmedCount = Object.keys(answers).length;

  const isCurrentConfirmed = answers[currentIdx] !== undefined;
  const isCurrentModified = selectedOption !== null && selectedOption !== answers[currentIdx];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 720,
        background: "rgba(19, 27, 38, 0.94)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(56, 189, 248, 0.22)",
        borderRadius: 16,
        padding: "28px 24px 32px",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45)",
        color: "#e2e8f0",
        position: "relative",
      }}
    >
      {/* VÙNG KẾT QUẢ KHI HOÀN THÀNH */}
      {isFinished && scoreResult ? (
        <div>
          <div style={{ color: "#38bdf8", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
            KẾT QUẢ SÁT HẠCH CHUYÊN MÔN
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 8px 0" }}>
            {scoreResult.isPass ? "Chúc Mừng! Bạn Đã ĐẠT Yêu Cầu" : "Chưa Đạt Điểm Chuẩn"}
          </h1>
          <p style={{ fontSize: 13.5, color: "#94a3b8", marginBottom: 20 }}>
            Thí sinh: <strong style={{ color: "#fff" }}>{userName}</strong> ({userEmail}) &bull; Đợt: <strong>{scoreResult.period}</strong>
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              background: "#0f172a",
              border: `1px solid ${scoreResult.isPass ? "#10b981" : "#ef4444"}`,
              borderRadius: 12,
              padding: "20px 24px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 48,
                fontWeight: 800,
                color: scoreResult.isPass ? "#10b981" : "#ef4444",
                lineHeight: 1,
              }}
            >
              {scoreResult.correctCount} / {scoreResult.total}
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 8, fontWeight: 600 }}>
              Tỷ lệ chính xác: {scoreResult.percentage}% &bull; Chuẩn đạt: 80% (từ 20/25 câu trở lên)
            </div>
          </div>

          <div
            style={{
              background: scoreResult.isPass ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
              border: `1px solid ${scoreResult.isPass ? "#10b981" : "#ef4444"}`,
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 24,
              fontSize: 13.5,
              color: "#e2e8f0",
              lineHeight: 1.5,
            }}
          >
            {scoreResult.isPass ? (
              <span>
                ✓ Bạn đã xuất sắc hoàn thành bài test kiến thức kỹ thuật định kỳ với kết quả đạt chuẩn của Đội Nâng Chuyển Tải.
              </span>
            ) : (
              <span>
                ✕ Kết quả của bạn chưa đạt mức điểm yêu cầu (tối thiểu 80%). Vui lòng liên hệ Quản trị viên để được hướng dẫn ôn tập hoặc cấp quyền làm lại bài thi.
              </span>
            )}
          </div>

          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 14 }}>
            Chi tiết đáp án từng câu hỏi
          </h2>

          <div style={{ display: "grid", gap: 14, marginBottom: 28, maxHeight: 460, overflowY: "auto", paddingRight: 4 }}>
            {scoreResult.answers.map((item, idx) => {
              const q = questions[idx];
              return (
                <div
                  key={idx}
                  style={{
                    background: "#0f172a",
                    border: `1px solid ${item.isCorrect ? "rgba(16, 185, 129, 0.6)" : "rgba(239, 68, 68, 0.6)"}`,
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8", fontFamily: "monospace" }}>
                      CÂU {idx + 1} &bull; {item.category}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 12.5,
                        color: item.isCorrect ? "#10b981" : "#ef4444",
                      }}
                    >
                      {item.isCorrect ? "✓ Đúng" : "✕ Chưa đúng"}
                    </span>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: 14, color: "#fff", marginBottom: 10, lineHeight: 1.4 }}>
                    {item.content}
                  </div>

                  {q?.options && (
                    <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                      {q.options.map((opt, optIdx) => {
                        const isChosen = item.userAnswer === optIdx;
                        const isRight = item.correctAnswer === optIdx;
                        let bg = "#1e293b";
                        let borderColor = "transparent";
                        let textColor = "#94a3b8";

                        if (isRight) {
                          bg = "rgba(16, 185, 129, 0.18)";
                          borderColor = "#10b981";
                          textColor = "#a7f3d0";
                        } else if (isChosen && !isRight) {
                          bg = "rgba(239, 68, 68, 0.18)";
                          borderColor = "#ef4444";
                          textColor = "#fca5a5";
                        }

                        return (
                          <div
                            key={optIdx}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              background: bg,
                              border: `1px solid ${borderColor}`,
                              color: textColor,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span style={{ fontWeight: 700, fontFamily: "monospace", width: 20 }}>
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <span style={{ flex: 1 }}>{opt}</span>
                            {isChosen && <span style={{ fontSize: 11, fontStyle: "italic" }}>(Bạn chọn)</span>}
                            {isRight && <span style={{ fontSize: 11, fontWeight: 700 }}>✓ Đáp án đúng</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {item.explanation && (
                    <div style={{ marginTop: 8, fontSize: 12.5, color: "#cbd5e1", background: "#1e293b", padding: "8px 10px", borderRadius: 6 }}>
                      <strong style={{ color: "#38bdf8" }}>Giải thích:</strong> {item.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/" style={{ width: "100%" }}>
              <button
                type="button"
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  background: "#0284c7",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                Hoàn tất &amp; Quay lại Trang Chủ
              </button>
            </Link>
          </div>
        </div>
      ) : (
        /* VÙNG LÀM BÀI */
        <div>
          {/* Thanh trên cùng */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                <span>Thí sinh:</span>
                <strong style={{ color: "#fff" }}>{userName}</strong>
                <span style={{ color: "#64748b" }}>({userEmail})</span>
              </div>
            </div>

            {/* Đồng hồ đếm ngược */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: timeLeft <= 120 ? "rgba(239, 68, 68, 0.2)" : "#0f172a",
                border: `1px solid ${timeLeft <= 120 ? "#ef4444" : "#334155"}`,
                padding: "6px 12px",
                borderRadius: 8,
                fontFamily: "monospace",
                fontSize: 15,
                fontWeight: 700,
                color: timeLeft <= 120 ? "#f87171" : "#38bdf8",
              }}
            >
              <Clock size={15} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Thanh tiến độ */}
          <div
            style={{
              width: "100%",
              height: 6,
              background: "#1e293b",
              borderRadius: 999,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPercent}%`,
                background: "linear-gradient(90deg, #f59e0b, #38bdf8)",
                transition: "width 0.25s ease",
              }}
            />
          </div>

          {/* Tiêu đề câu hỏi */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#38bdf8",
                boxShadow: "0 0 8px #38bdf8",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#38bdf8",
                letterSpacing: "0.08em",
                fontFamily: "monospace",
              }}
            >
              CÂU {currentIdx + 1}/{totalQuestions}
            </span>
            {currentQ?.category && (
              <span style={{ fontSize: 12, color: "#64748b", marginLeft: 4 }}>
                &bull; {currentQ.category}
              </span>
            )}
          </div>

          {/* Nội dung câu hỏi */}
          <h2
            style={{
              fontSize: 19,
              fontWeight: 700,
              lineHeight: 1.45,
              color: "#ffffff",
              margin: "6px 0 20px 0",
            }}
          >
            {currentQ?.content || currentQ?.question_text}
          </h2>

          {/* DANH SÁCH ĐÁP ÁN: Cho phép bấm chọn và đổi qua lại thoải mái */}
          <div style={{ display: "grid", gap: 11, marginBottom: 20 }}>
            {currentQ?.options?.map((opt, i) => {
              const isSelected = selectedOption === i;
              const isConfirmed = answers[currentIdx] === i;

              let cardBg = "#1b2533";
              let cardBorder = "#2a374a";
              let badgeBg = "#2a374a";
              let badgeColor = "#94a3b8";
              let textColor = "#e2e8f0";

              if (isSelected) {
                cardBg = "#0c312c";
                cardBorder = "#10b981";
                badgeBg = "#10b981";
                badgeColor = "#ffffff";
                textColor = "#ffffff";
              }

              return (
                <div
                  key={i}
                  onClick={() => handlePickOption(i)}
                  style={{
                    background: cardBg,
                    border: `1.5px solid ${cardBorder}`,
                    borderRadius: 10,
                    padding: "13px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: badgeBg,
                      color: badgeColor,
                      fontWeight: 800,
                      fontSize: 13.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "monospace",
                      flexShrink: 0,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>

                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: isSelected ? 600 : 400,
                      color: textColor,
                      flex: 1,
                      lineHeight: 1.4,
                    }}
                  >
                    {opt}
                  </div>

                  {isConfirmed && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#10b981",
                        background: "rgba(16, 185, 129, 0.2)",
                        padding: "3px 8px",
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Check size={12} /> Đã chọn
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Thông báo xác nhận */}
          {confirmToast && (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid #10b981",
                borderRadius: 8,
                padding: "8px 14px",
                color: "#6ee7b7",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CheckCircle2 size={16} />
              <span>{confirmToast}</span>
            </div>
          )}

          {/* HÀNG NÚT BẤM THAO TÁC */}
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {/* NÚT XÁC NHẬN CHỌN ĐÁP ÁN */}
            <button
              type="button"
              onClick={handleConfirmAnswer}
              disabled={selectedOption === null || selectedOption === undefined}
              style={{
                width: "100%",
                padding: "12px 18px",
                borderRadius: 10,
                border: "none",
                fontWeight: 700,
                fontSize: 14,
                cursor: selectedOption === null || selectedOption === undefined ? "not-allowed" : "pointer",
                background:
                  selectedOption === null || selectedOption === undefined
                    ? "#1e293b"
                    : isCurrentConfirmed && !isCurrentModified
                    ? "#065f46"
                    : "#10b981",
                color: selectedOption === null || selectedOption === undefined ? "#64748b" : "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.15s ease",
              }}
            >
              <Check size={16} />
              {selectedOption === null || selectedOption === undefined
                ? "Chọn 1 đáp án ở trên rồi bấm Xác nhận"
                : isCurrentConfirmed && !isCurrentModified
                ? `✓ Đã xác nhận đáp án [${String.fromCharCode(65 + selectedOption)}] (Bấm chọn đáp án khác để đổi nếu muốn)`
                : `Xác nhận chọn đáp án [${String.fromCharCode(65 + selectedOption)}]`}
            </button>

            {/* HÀNG ĐIỀU HƯỚNG: Câu trước & Câu tiếp theo */}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={handlePrev}
                style={{
                  flex: 1,
                  padding: "13px 16px",
                  borderRadius: 10,
                  border: "1px solid #334155",
                  background: "transparent",
                  color: currentIdx === 0 ? "#475569" : "#cbd5e1",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: currentIdx === 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <ArrowLeft size={16} />
                Câu trước
              </button>

              {currentIdx < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  style={{
                    flex: 2,
                    padding: "13px 20px",
                    borderRadius: 10,
                    border: "none",
                    background: "#0284c7",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  Câu tiếp theo
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const answeredCount = Object.keys(answers).length + (selectedOption !== null && answers[currentIdx] === undefined ? 1 : 0);
                    if (
                      confirm(
                        `Bạn đã hoàn thành ${answeredCount}/${totalQuestions} câu hỏi.\n\nBạn có chắc chắn muốn nộp bài thi ngay bây giờ?`
                      )
                    ) {
                      handleSubmitQuiz();
                    }
                  }}
                  style={{
                    flex: 2,
                    padding: "13px 20px",
                    borderRadius: 10,
                    border: "none",
                    background: "#10b981",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Send size={16} />
                  Nộp bài thi sát hạch
                </button>
              )}
            </div>
          </div>

          {/* LƯỚI NHẢY NHANH 25 CÂU HỎI */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 16,
              borderTop: "1px solid #1e293b",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 12, color: "#94a3b8" }}>
              <span>
                Đã xác nhận: <strong style={{ color: "#10b981" }}>{confirmedCount}</strong> / {totalQuestions} câu
              </span>
              <span style={{ fontSize: 11, color: "#64748b" }}>
                (Bấm vào số câu để chuyển nhanh)
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {questions.map((_, i) => {
                const isConfirmed = answers[i] !== undefined;
                const isCurrent = currentIdx === i;

                let bg = "#0f172a";
                let borderColor = "#1e293b";
                let textColor = "#64748b";

                if (isCurrent) {
                  borderColor = "#38bdf8";
                  textColor = "#38bdf8";
                  bg = "rgba(56, 189, 248, 0.15)";
                } else if (isConfirmed) {
                  bg = "rgba(16, 185, 129, 0.2)";
                  borderColor = "rgba(16, 185, 129, 0.5)";
                  textColor = "#34d399";
                }

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleJumpTo(i)}
                    style={{
                      width: 32,
                      height: 32,
                      padding: 0,
                      fontSize: 12,
                      fontFamily: "monospace",
                      fontWeight: isCurrent ? 800 : isConfirmed ? 700 : 500,
                      borderRadius: 6,
                      border: `1.5px solid ${borderColor}`,
                      background: bg,
                      color: textColor,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            maxWidth: 600,
            margin: "40px auto",
            padding: 32,
            background: "#131b26",
            borderRadius: 16,
            textAlign: "center",
            color: "#94a3b8",
          }}
        >
          Đang tải đề thi...
        </div>
      }
    >
      <QuizContent />
    </Suspense>
  );
}
