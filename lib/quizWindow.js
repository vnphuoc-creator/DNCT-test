// Kiểm tra xem hiện tại có đang trong khung thời gian cho phép làm bài không.
//
// CÁCH 1 — Lặp lại hằng tháng (khuyên dùng, không cần chỉnh lại mỗi tháng):
//   NEXT_PUBLIC_QUIZ_OPEN_DAY = ngày mở trong tháng, ví dụ "27"
//   Bài test sẽ tự động mở từ ngày đó tới hết tháng, rồi tự khoá lại cho tới
//   đúng ngày đó ở tháng kế tiếp — không cần vào Vercel chỉnh sửa hằng tháng.
//
// CÁCH 2 — Một mốc thời gian cố định, chỉ áp dụng đúng 1 lần (nếu đặt cả 2
// biến này, chúng được ưu tiên hơn Cách 1):
//   NEXT_PUBLIC_QUIZ_START    - thời điểm MỞ, định dạng ISO, ví dụ: 2026-08-05T08:00:00+07:00
//   NEXT_PUBLIC_QUIZ_DEADLINE - thời điểm ĐÓNG, cùng định dạng
//
// Không đặt biến nào cả -> bài test luôn mở, không giới hạn thời gian.
export function getQuizWindowStatus() {
  const startStr = process.env.NEXT_PUBLIC_QUIZ_START;
  const deadlineStr = process.env.NEXT_PUBLIC_QUIZ_DEADLINE;
  const openDayStr = process.env.NEXT_PUBLIC_QUIZ_OPEN_DAY;

  const now = new Date();

  // Cách 2 ưu tiên trước nếu có đặt
  if (startStr || deadlineStr) {
    const start = startStr ? new Date(startStr) : null;
    const deadline = deadlineStr ? new Date(deadlineStr) : null;
    if (start && now < start) {
      return { open: false, reason: "not_started", start, deadline, mode: "fixed" };
    }
    if (deadline && now > deadline) {
      return { open: false, reason: "ended", start, deadline, mode: "fixed" };
    }
    return { open: true, reason: null, start, deadline, mode: "fixed" };
  }

  // Cách 1: lặp lại hằng tháng
  if (openDayStr) {
    const openDay = parseInt(openDayStr, 10);
    const today = now.getDate();

    if (today >= openDay) {
      // Đang mở, tính luôn "hạn chót" là cuối ngày cuối cùng của tháng này để hiển thị
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { open: true, reason: null, start: null, deadline: lastDayOfMonth, mode: "monthly", openDay };
    }

    // Chưa tới ngày mở, tính ngày mở tiếp theo trong chính tháng này để hiển thị
    const nextOpen = new Date(now.getFullYear(), now.getMonth(), openDay, 0, 0, 0);
    return { open: false, reason: "not_started", start: nextOpen, deadline: null, mode: "monthly", openDay };
  }

  return { open: true, reason: null, start: null, deadline: null, mode: "none" };
}

export function formatVNDateTime(date) {
  if (!date) return "";
  return date.toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatVNDate(date) {
  if (!date) return "";
  return date.toLocaleDateString("vi-VN", { dateStyle: "medium" });
}

// Tạo sẵn câu thông báo tiếng Việt phù hợp cho cả 2 chế độ (lặp hằng tháng / mốc cố định)
export function formatWindowMessage(status) {
  if (status.open) {
    if (status.mode === "monthly") {
      return `Bài test đang mở, đến hết ngày ${formatVNDate(status.deadline)}.`;
    }
    return "";
  }
  if (status.mode === "monthly") {
    return `Bài test chỉ mở từ ngày ${status.openDay} hằng tháng đến hết tháng. Quay lại vào ngày ${formatVNDate(status.start)}.`;
  }
  if (status.reason === "not_started") {
    return `Bài test chưa mở. Vui lòng quay lại sau lúc ${formatVNDateTime(status.start)}.`;
  }
  return `Bài test đã kết thúc lúc ${formatVNDateTime(status.deadline)}, không thể làm bài nữa.`;
}
