// Quản lý khung thời gian mở bài test định kỳ hàng tháng.
// Giờ được cấu hình theo giờ Việt Nam (UTC+7).
import { getSettings } from "./settings";

export const DEFAULT_OPEN_DAY = 27;
export const DEFAULT_CLOSE_DAY = 30;
export const DEFAULT_OPEN_TIME = "08:00";
export const DEFAULT_CLOSE_TIME = "17:00";

function normalizeTime(value, fallback) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ""));
  return m ? `${m[1]}:${m[2]}` : fallback;
}

function vietnamNowParts(now = new Date()) {
  const shifted = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

function makeVietnamDate(year, month, day, time) {
  const [h, m] = normalizeTime(time, "00:00").split(":").map(Number);
  return new Date(Date.UTC(year, month, day, h, m, 0, 0) - 7 * 60 * 60 * 1000);
}

export async function getQuizWindowStatus() {
  const settings = await getSettings();

  if (settings.quiz_override_open === "true") {
    return { open: true, reason: null, start: null, deadline: null, mode: "override" };
  }

  const startStr = process.env.NEXT_PUBLIC_QUIZ_START;
  const deadlineStr = process.env.NEXT_PUBLIC_QUIZ_DEADLINE;
  const now = new Date();

  if (startStr || deadlineStr) {
    const start = startStr ? new Date(startStr) : null;
    const deadline = deadlineStr ? new Date(deadlineStr) : null;
    if (start && now < start) return { open: false, reason: "not_started", start, deadline, mode: "fixed" };
    if (deadline && now > deadline) return { open: false, reason: "ended", start, deadline, mode: "fixed" };
    return { open: true, reason: null, start, deadline, mode: "fixed" };
  }

  const openDay = parseInt(
    settings.quiz_open_day || process.env.NEXT_PUBLIC_QUIZ_OPEN_DAY || DEFAULT_OPEN_DAY, 10
  );
  const configuredCloseDay = parseInt(
    settings.quiz_close_day || process.env.NEXT_PUBLIC_QUIZ_CLOSE_DAY || DEFAULT_CLOSE_DAY, 10
  );
  const openTime = normalizeTime(settings.quiz_open_time || DEFAULT_OPEN_TIME, DEFAULT_OPEN_TIME);
  const closeTime = normalizeTime(settings.quiz_close_time || DEFAULT_CLOSE_TIME, DEFAULT_CLOSE_TIME);

  const p = vietnamNowParts(now);
  const currentYear = p.year;
  const currentMonth = p.month;
  const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
  const closeDay = Math.min(configuredCloseDay, daysInMonth);
  const start = makeVietnamDate(currentYear, currentMonth, openDay, openTime);
  const deadline = makeVietnamDate(currentYear, currentMonth, closeDay, closeTime);

  if (now >= start && now <= deadline) {
    return { open: true, reason: null, start, deadline, mode: "monthly", openDay, closeDay, openTime, closeTime };
  }

  if (now < start) {
    return { open: false, reason: "not_started", start, deadline, mode: "monthly", openDay, closeDay, openTime, closeTime };
  }

  const nextMonthOpen = makeVietnamDate(currentYear, currentMonth + 1, openDay, openTime);
  return {
    open: false,
    reason: "ended",
    start: nextMonthOpen,
    deadline,
    mode: "monthly",
    openDay,
    closeDay,
    openTime,
    closeTime,
  };
}

export function formatVNDateTime(date) {
  if (!date) return "";
  return date.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
}

export function formatVNDate(date) {
  if (!date) return "";
  return date.toLocaleDateString("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" });
}

export function isResultInOfficialWindow(createdAtStr) {
  if (!createdAtStr) return false;
  const d = new Date(createdAtStr);
  const p = vietnamNowParts(d);
  return p.day >= DEFAULT_OPEN_DAY && p.day <= DEFAULT_CLOSE_DAY;
}

export function formatWindowMessage(status) {
  if (status.open) {
    if (status.mode === "override") return "Quản trị viên đang tạm mở cho làm bài sớm (ngoài lịch thường lệ).";
    if (status.mode === "monthly") {
      return `Hệ thống thi đang mở từ ngày ${status.openDay} ${status.openTime} đến ngày ${status.closeDay} ${status.closeTime} (giờ Việt Nam).`;
    }
    return `Bài test đang mở đến ${formatVNDateTime(status.deadline)}.`;
  }
  if (status.mode === "monthly") {
    if (status.reason === "not_started") {
      return `Bài test định kỳ mở từ ngày ${status.openDay} ${status.openTime} đến ngày ${status.closeDay} ${status.closeTime} (giờ Việt Nam). Chưa tới giờ mở, vui lòng quay lại lúc ${formatVNDateTime(status.start)}.`;
    }
    return `Kỳ thi tháng này đã đóng lúc ${formatVNDateTime(status.deadline)}. Kỳ thi tiếp theo sẽ mở lúc ${formatVNDateTime(status.start)}.`;
  }
  if (status.reason === "not_started") return `Bài test chưa mở. Vui lòng quay lại sau lúc ${formatVNDateTime(status.start)}.`;
  return `Bài test đã kết thúc lúc ${formatVNDateTime(status.deadline)}, không thể làm bài nữa.`;
}
