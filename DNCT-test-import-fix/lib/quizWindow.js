// Quản lý khung thời gian mở bài test định kỳ hàng tháng cho Đội ĐNCT (AHT).
// Quy định chuẩn: chỉ mở làm bài test từ ngày 27 đến ngày 30 hằng tháng.
//
// THỨ TỰ ƯU TIÊN cấu hình (cái nào có thì dùng, không thì rơi xuống cái dưới):
//   1. Cờ "Cho phép làm bài sớm" trong trang Cài đặt (admin bật/tắt ngay lập tức,
//      không cần deploy lại) -> nếu bật, bỏ qua mọi giới hạn ngày, luôn mở.
//   2. Ngày mở/đóng đặt trong trang Cài đặt (lưu trong Supabase).
//   3. Biến môi trường NEXT_PUBLIC_QUIZ_START / NEXT_PUBLIC_QUIZ_DEADLINE (mốc cố định 1 lần).
//   4. Biến môi trường NEXT_PUBLIC_QUIZ_OPEN_DAY / NEXT_PUBLIC_QUIZ_CLOSE_DAY.
//   5. Mặc định cứng: mở ngày 27, đóng ngày 30.

import { getSettings } from "./settings";

export const DEFAULT_OPEN_DAY = 27;
export const DEFAULT_CLOSE_DAY = 30;
// Khung giờ mở bài mỗi ngày trong đợt thi. Mặc định 00:00–23:59 (mở cả ngày),
// admin có thể thu hẹp lại trong trang Cài đặt, ví dụ chỉ mở 08:00–17:00.
export const DEFAULT_OPEN_TIME = "00:00";
export const DEFAULT_CLOSE_TIME = "23:59";

// "HH:MM" -> số phút trong ngày, để so sánh dễ dàng. Trả về null nếu không hợp lệ.
function timeStrToMinutes(str) {
  if (!str || typeof str !== "string") return null;
  const m = str.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export async function getQuizWindowStatus() {
  const settings = await getSettings();

  const openTime = settings.quiz_open_time || DEFAULT_OPEN_TIME;
  const closeTime = settings.quiz_close_time || DEFAULT_CLOSE_TIME;
  const openTimeMin = timeStrToMinutes(openTime) ?? timeStrToMinutes(DEFAULT_OPEN_TIME);
  const closeTimeMin = timeStrToMinutes(closeTime) ?? timeStrToMinutes(DEFAULT_CLOSE_TIME);
  // Chỉ tính là "có giới hạn khung giờ" khi admin thật sự thu hẹp so với mặc định (cả ngày)
  const hasTimeRestriction = openTimeMin > 0 || closeTimeMin < timeStrToMinutes(DEFAULT_CLOSE_TIME);

  // 1. Cờ ghi đè khẩn cấp từ trang Cài đặt — ưu tiên cao nhất (vẫn bỏ qua luôn khung giờ)
  if (settings.quiz_override_open === "true") {
    return {
      open: true,
      reason: null,
      start: null,
      deadline: null,
      mode: "override",
    };
  }

  const startStr = process.env.NEXT_PUBLIC_QUIZ_START;
  const deadlineStr = process.env.NEXT_PUBLIC_QUIZ_DEADLINE;

  const now = new Date();

  // 2b. Nếu có cấu hình mốc ngày giờ cố định qua biến môi trường (không dùng chu kỳ hằng tháng)
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

  // 2 & 4 & 5: chu kỳ hằng tháng — ưu tiên cài đặt trong database, sau đó tới biến môi
  // trường, cuối cùng mới tới mặc định cứng
  const openDay = parseInt(
    settings.quiz_open_day || process.env.NEXT_PUBLIC_QUIZ_OPEN_DAY || DEFAULT_OPEN_DAY,
    10
  );
  const configuredCloseDay = parseInt(
    settings.quiz_close_day || process.env.NEXT_PUBLIC_QUIZ_CLOSE_DAY || DEFAULT_CLOSE_DAY,
    10
  );

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const today = now.getDate();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const closeDay = Math.min(configuredCloseDay, daysInMonth);

  if (today >= openDay && today <= closeDay) {
    const deadline = new Date(currentYear, currentMonth, closeDay, 23, 59, 59, 999);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Trong đúng khung ngày mở bài, nhưng ngoài khung giờ mở trong ngày hôm nay
    if (hasTimeRestriction && (nowMinutes < openTimeMin || nowMinutes > closeTimeMin)) {
      return {
        open: false,
        reason: nowMinutes < openTimeMin ? "outside_time_before" : "outside_time_after",
        start: new Date(currentYear, currentMonth, openDay, 0, 0, 0),
        deadline,
        mode: "monthly",
        openDay,
        closeDay,
        openTime,
        closeTime,
      };
    }

    return {
      open: true,
      reason: null,
      start: new Date(currentYear, currentMonth, openDay, 0, 0, 0),
      deadline,
      mode: "monthly",
      openDay,
      closeDay,
      openTime,
      closeTime,
      hasTimeRestriction,
    };
  }

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
      openTime,
      closeTime,
      hasTimeRestriction,
    };
  }

  const nextMonthOpen = new Date(currentYear, currentMonth + 1, openDay, 0, 0, 0);
  return {
    open: false,
    reason: "ended",
    start: nextMonthOpen,
    deadline: new Date(currentYear, currentMonth, closeDay, 23, 59, 59),
    mode: "monthly",
    openDay,
    closeDay,
    openTime,
    closeTime,
    hasTimeRestriction,
  };
}

export function formatVNDateTime(date) {
  if (!date) return "";
  return date.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
}

export function formatVNDate(date) {
  if (!date) return "";
  return date.toLocaleDateString("vi-VN", { dateStyle: "medium" });
}

export function isResultInOfficialWindow(createdAtStr) {
  if (!createdAtStr) return false;
  const d = new Date(createdAtStr);
  const day = d.getDate();
  return day >= DEFAULT_OPEN_DAY && day <= DEFAULT_CLOSE_DAY;
}

export function formatWindowMessage(status) {
  const timeSuffix =
    status.mode === "monthly" && status.hasTimeRestriction
      ? ` Mỗi ngày trong đợt thi chỉ mở từ ${status.openTime} đến ${status.closeTime}.`
      : "";

  if (status.open) {
    if (status.mode === "override") {
      return "Quản trị viên đang tạm mở cho làm bài sớm (ngoài lịch thường lệ).";
    }
    if (status.mode === "monthly") {
      return `Hệ thống thi đang mở từ ngày ${status.openDay} đến hết ngày ${status.closeDay} tháng này (${formatVNDate(status.deadline)}).${timeSuffix}`;
    }
    return `Bài test đang mở đến ${formatVNDateTime(status.deadline)}.`;
  }

  if (status.reason === "outside_time_before") {
    return `Bài test hôm nay chỉ mở từ ${status.openTime} đến ${status.closeTime}. Vui lòng quay lại từ ${status.openTime} hôm nay.`;
  }
  if (status.reason === "outside_time_after") {
    return `Bài test hôm nay đã đóng lúc ${status.closeTime}. Vui lòng quay lại từ ${status.openTime} ngày mai (trong đợt thi từ ngày ${status.openDay} đến ngày ${status.closeDay}).`;
  }

  if (status.mode === "monthly") {
    if (status.reason === "not_started") {
      return `Bài test định kỳ chỉ mở từ ngày ${status.openDay} đến ngày ${status.closeDay} hằng tháng. Hệ thống chưa mở làm bài (vui lòng quay lại vào ngày ${formatVNDate(status.start)}).${timeSuffix}`;
    }
    return `Kỳ thi tháng này đã đóng vào ngày ${status.closeDay}. Kỳ thi tiếp theo sẽ mở vào ngày ${formatVNDate(status.start)}.${timeSuffix}`;
  }

  if (status.reason === "not_started") {
    return `Bài test chưa mở. Vui lòng quay lại sau lúc ${formatVNDateTime(status.start)}.`;
  }
  return `Bài test đã kết thúc lúc ${formatVNDateTime(status.deadline)}, không thể làm bài nữa.`;
}
