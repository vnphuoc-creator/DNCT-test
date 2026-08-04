// Kiểm tra xem hiện tại có đang trong khung thời gian cho phép làm bài không.
// Cấu hình qua 2 biến môi trường (không bắt buộc):
//   NEXT_PUBLIC_QUIZ_START    - thời điểm MỞ bài test, định dạng ISO, ví dụ: 2026-08-05T08:00:00+07:00
//   NEXT_PUBLIC_QUIZ_DEADLINE - thời điểm ĐÓNG bài test (hạn chót nộp bài), cùng định dạng
// Nếu không đặt biến nào, bài test luôn mở, không giới hạn thời gian.
export function getQuizWindowStatus() {
  const startStr = process.env.NEXT_PUBLIC_QUIZ_START;
  const deadlineStr = process.env.NEXT_PUBLIC_QUIZ_DEADLINE;

  const now = new Date();
  const start = startStr ? new Date(startStr) : null;
  const deadline = deadlineStr ? new Date(deadlineStr) : null;

  if (start && now < start) {
    return { open: false, reason: "not_started", start, deadline };
  }
  if (deadline && now > deadline) {
    return { open: false, reason: "ended", start, deadline };
  }
  return { open: true, reason: null, start, deadline };
}

export function formatVNDateTime(date) {
  if (!date) return "";
  return date.toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
