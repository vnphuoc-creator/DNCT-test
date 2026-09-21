// Quản lý khung thời gian mở bài test định kỳ hàng tháng cho Đội ĐNCT (AHT).
// Tự động kết nối với Cài đặt Hệ thống: Khung ngày trong tháng và Khung giờ trong ngày.

import { getLocalSettings, checkQuizScheduleStatus } from "./settings";

export function getQuizWindowStatus() {
  const settings = getLocalSettings();
  const status = checkQuizScheduleStatus(settings);

  return {
    open: status.open,
    reason: status.reason,
    message: status.message,
    deadline: status.deadline,
    start: status.start,
    cfg: status.cfg,
    openDay: status.cfg?.monthlyOpenDay || 27,
    closeDay: status.cfg?.monthlyCloseDay || 30,
    dailyHoursEnabled: status.cfg?.enableDailyHours,
    dailyOpenTime: status.cfg?.dailyOpenTime,
    dailyCloseTime: status.cfg?.dailyCloseTime,
  };
}

export function formatWindowMessage(status) {
  if (status.message) return status.message;

  if (status.reason === "not_started" || status.reason === "not_started_date") {
    return `Kỳ thi chưa mở. Hệ thống mở từ ngày ${status.openDay} đến hết ngày ${status.closeDay} hằng tháng.`;
  }
  if (status.reason === "ended" || status.reason === "ended_date") {
    return `Kỳ thi tháng này đã kết thúc. Vui lòng quay lại vào ngày ${status.openDay} tháng tới.`;
  }
  if (status.reason === "not_started_hour") {
    return `Hôm nay bài test chỉ mở trong khung giờ ${status.dailyOpenTime} - ${status.dailyCloseTime}. Vui lòng quay lại sau ${status.dailyOpenTime}.`;
  }
  if (status.reason === "ended_hour") {
    return `Khung giờ thi hôm nay đã kết thúc lúc ${status.dailyCloseTime} (Khung giờ: ${status.dailyOpenTime} - ${status.dailyCloseTime}). Vui lòng quay lại vào ngày mai.`;
  }
  return "Hệ thống đang mở bài thi định kỳ.";
}
