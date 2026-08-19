// Quản lý khung thời gian mở bài test định kỳ hàng tháng cho Đội ĐNCT (AHT).
// Quy định chuẩn: Chỉ mở làm bài test từ ngày 27 đến ngày 30 hằng tháng.
// Các lượt làm bài ngoài khoảng thời gian này sẽ bị khoá hoặc không được tính điểm chính thức.

export const DEFAULT_OPEN_DAY = 27;
export const DEFAULT_CLOSE_DAY = 30;

export function getQuizWindowStatus() {
  const startStr = process.env.NEXT_PUBLIC_QUIZ_START;
  const deadlineStr = process.env.NEXT_PUBLIC_QUIZ_DEADLINE;
  const openDayStr = process.env.NEXT_PUBLIC_QUIZ_OPEN_DAY;
  const closeDayStr = process.env.NEXT_PUBLIC_QUIZ_CLOSE_DAY;

  const now = new Date();

  // 1. Nếu có cấu hình ngày giờ cố định qua biến môi trường
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

  // 2. Mặc định theo chu kỳ hằng tháng: Từ ngày 27 đến ngày 30 (hoặc hết tháng)
  const openDay = openDayStr ? parseInt(openDayStr, 10) : DEFAULT_OPEN_DAY;
  const configuredCloseDay = closeDayStr ? parseInt(closeDayStr, 10) : DEFAULT_CLOSE_DAY;
  
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const today = now.getDate();
  
  // Ngày cuối cùng thực tế của tháng hiện tại (ví dụ 28, 30, 31)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const closeDay = Math.min(configuredCloseDay, daysInMonth);

  // Đang trong khung thời gian từ ngày 27 đến ngày 30
  if (today >= openDay && today <= closeDay) {
    const deadline = new Date(currentYear, currentMonth, closeDay, 23, 59, 59, 999);
    return {
      open: true,
      reason: null,
      start: new Date(currentYear, currentMonth, openDay, 0, 0, 0),
      deadline,
      mode: "monthly",
      openDay,
      closeDay,
    };
  }

  // Chưa đến ngày mở trong tháng hiện tại (today < openDay)
  if (today < openDay) {
    const nextOpen = new Date(currentYear, currentMonth, openDay, 0, 0, 0);
    return {
      open: false,
      reason: "not_started",
      start: nextOpen,
      deadline: new Date(currentYear, currentMonth, closeDay, 23, 59, 59),
      mode: "monthly",
      openDay,
      closeDay,
    };
  }

  // Đã qua ngày đóng trong tháng hiện tại (today > closeDay) -> Chờ đến ngày 27 tháng kế tiếp
  const nextMonthOpen = new Date(currentYear, currentMonth + 1, openDay, 0, 0, 0);
  return {
    open: false,
    reason: "ended",
    start: nextMonthOpen,
    deadline: new Date(currentYear, currentMonth, closeDay, 23, 59, 59),
    mode: "monthly",
    openDay,
    closeDay,
  };
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

// Kiểm tra xem một thời điểm kết quả (timestamp) có nằm trong khung ngày 27-30 hợp lệ không
export function isResultInOfficialWindow(createdAtStr) {
  if (!createdAtStr) return false;
  const d = new Date(createdAtStr);
  const day = d.getDate();
  return day >= DEFAULT_OPEN_DAY && day <= DEFAULT_CLOSE_DAY;
}

// Câu thông báo chi tiết, thân thiện và chuẩn xác
export function formatWindowMessage(status) {
  if (status.open) {
    if (status.mode === "monthly") {
      return `Hệ thống thi đang mở từ ngày ${status.openDay} đến hết ngày ${status.closeDay} tháng này (${formatVNDate(status.deadline)}).`;
    }
    return `Bài test đang mở đến ${formatVNDateTime(status.deadline)}.`;
  }
  
  if (status.mode === "monthly") {
    if (status.reason === "not_started") {
      return `Bài test định kỳ chỉ mở từ ngày ${status.openDay} đến ngày ${status.closeDay} hằng tháng. Hệ thống chưa mở làm bài (Vui lòng quay lại vào ngày ${formatVNDate(status.start)}).`;
    }
    return `Kỳ thi tháng này đã đóng vào ngày ${status.closeDay}. Kỳ thi tiếp theo sẽ mở vào ngày ${formatVNDate(status.start)}.`;
  }
  
  if (status.reason === "not_started") {
    return `Bài test chưa mở. Vui lòng quay lại sau lúc ${formatVNDateTime(status.start)}.`;
  }
  return `Bài test đã kết thúc lúc ${formatVNDateTime(status.deadline)}, không thể làm bài nữa.`;
}
