// Quản lý và đồng bộ cấu hình hệ thống thi trắc nghiệm AHT - Đội ĐNCT.
// Tự động đồng bộ trên toàn bộ ứng dụng: Trang chủ, Trang thi, Quy chế & Hướng dẫn, Báo cáo...

export const DEFAULT_SETTINGS = {
  // 1. Quy định thời gian làm bài & số câu
  quizDurationMinutes: 30, // Thời gian làm bài (phút)
  questionsCount: 25, // Số câu hỏi trong 1 bài thi
  passScorePercent: 80, // Điểm đạt chuẩn (%)
  excellentScorePercent: 90, // Điểm xuất sắc (%)

  // 2. Khung ngày mở thi hàng tháng
  monthlyOpenDay: 27, // Ngày mở bài hằng tháng (ví dụ: ngày 27)
  monthlyCloseDay: 30, // Ngày kết thúc hằng tháng (ví dụ: ngày 30)

  // 3. Khung giờ mở bài trong ngày
  enableDailyHours: false, // Giới hạn khung giờ trong ngày (false: mở cả ngày 00:00 - 23:59)
  dailyOpenTime: "08:00", // Giờ mở bài trong ngày (HH:mm)
  dailyCloseTime: "17:30", // Giờ đóng bài trong ngày (HH:mm)

  // 4. Chế độ đề thi & Bộ đề
  examMode: "random", // "random" (ngẫu nhiên chia đều hệ) | "selected_set" (theo bộ đề cố định)
  activeExamSetId: "set-01", // ID của bộ đề đang áp dụng khi chọn "selected_set"

  // 5. Cấu hình xác thực
  requireEmailVerification: true, // Yêu cầu nhập email khớp với danh sách nhân sự
};

const STORAGE_KEY = "aht_quiz_system_settings";

/**
 * Lấy cấu hình hệ thống từ localStorage (fallback về DEFAULT_SETTINGS)
 */
export function getLocalSettings() {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error("Lỗi đọc settings từ localStorage:", e);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Lưu cấu hình hệ thống vào localStorage và gửi sự kiện để các tab/component cập nhật
 */
export function saveLocalSettings(newSettings) {
  if (typeof window === "undefined") return newSettings;
  const merged = { ...DEFAULT_SETTINGS, ...newSettings };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("aht_settings_updated", { detail: merged }));
  } catch (e) {
    console.error("Lỗi ghi settings vào localStorage:", e);
  }
  return merged;
}

/**
 * Lấy cấu hình từ máy chủ (API /api/settings)
 */
export async function fetchServerSettings() {
  try {
    const res = await fetch("/api/settings", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      saveLocalSettings(data);
      return data;
    }
  } catch (e) {
    console.warn("Không kết nối được tới /api/settings, dùng cấu hình cục bộ:", e);
  }
  return getLocalSettings();
}

/**
 * Lưu cấu hình lên máy chủ (API /api/settings)
 */
export async function saveServerSettings(newSettings) {
  saveLocalSettings(newSettings);
  try {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    });
    if (res.ok) {
      const updated = await res.json();
      saveLocalSettings(updated);
      return updated;
    }
  } catch (e) {
    console.error("Lỗi lưu cấu hình lên server:", e);
  }
  return newSettings;
}

/**
 * Kiểm tra trạng thái khung thi (cả ngày VÀ giờ) theo cấu hình hiện tại
 */
export function checkQuizScheduleStatus(customSettings = null) {
  const cfg = customSettings || getLocalSettings();
  const now = new Date();

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const today = now.getDate();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeMinutes = currentHours * 60 + currentMinutes;

  const openDay = Number(cfg.monthlyOpenDay) || 27;
  const closeDaySetting = Number(cfg.monthlyCloseDay) || 30;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const closeDay = Math.min(closeDaySetting, daysInMonth);

  // Parse daily hours
  let openTimeMinutes = 0;
  let closeTimeMinutes = 23 * 60 + 59;
  if (cfg.enableDailyHours && cfg.dailyOpenTime && cfg.dailyCloseTime) {
    const [oH, oM] = cfg.dailyOpenTime.split(":").map(Number);
    const [cH, cM] = cfg.dailyCloseTime.split(":").map(Number);
    openTimeMinutes = (oH || 0) * 60 + (oM || 0);
    closeTimeMinutes = (cH || 23) * 60 + (cM || 59);
  }

  // 1. Kiểm tra theo ngày trong tháng
  if (today < openDay) {
    const nextStart = new Date(currentYear, currentMonth, openDay, Math.floor(openTimeMinutes / 60), openTimeMinutes % 60, 0);
    return {
      open: false,
      reason: "not_started_date",
      message: `Chưa đến ngày mở bài thi tháng này. Hệ thống mở từ ngày ${openDay} đến ngày ${closeDay} hằng tháng (Vui lòng quay lại vào ngày ${nextStart.toLocaleDateString("vi-VN")}).`,
      start: nextStart,
      cfg,
    };
  }

  if (today > closeDay) {
    const nextMonthStart = new Date(currentYear, currentMonth + 1, openDay, Math.floor(openTimeMinutes / 60), openTimeMinutes % 60, 0);
    return {
      open: false,
      reason: "ended_date",
      message: `Kỳ thi tháng này đã kết thúc vào ngày ${closeDay}. Kỳ thi tiếp theo sẽ mở vào ngày ${nextMonthStart.toLocaleDateString("vi-VN")}.`,
      start: nextMonthStart,
      cfg,
    };
  }

  // 2. Ngày hợp lệ (today >= openDay && today <= closeDay) -> Kiểm tra khung giờ trong ngày nếu có bật
  if (cfg.enableDailyHours) {
    if (currentTimeMinutes < openTimeMinutes) {
      return {
        open: false,
        reason: "not_started_hour",
        message: `Hôm nay bài test chỉ mở trong khung giờ ${cfg.dailyOpenTime} - ${cfg.dailyCloseTime}. Vui lòng quay lại sau lúc ${cfg.dailyOpenTime}.`,
        cfg,
      };
    }
    if (currentTimeMinutes > closeTimeMinutes) {
      return {
        open: false,
        reason: "ended_hour",
        message: `Khung giờ thi hôm nay đã kết thúc lúc ${cfg.dailyCloseTime} (Khung giờ: ${cfg.dailyOpenTime} - ${cfg.dailyCloseTime}). Vui lòng quay lại vào ngày mai lúc ${cfg.dailyOpenTime}.`,
        cfg,
      };
    }
  }

  // Khung thi đang mở hợp lệ
  const deadlineDate = new Date(
    currentYear,
    currentMonth,
    closeDay,
    Math.floor(closeTimeMinutes / 60),
    closeTimeMinutes % 60,
    59
  );

  return {
    open: true,
    reason: null,
    message: cfg.enableDailyHours
      ? `Bài test đang mở (từ ngày ${openDay} đến hết ngày ${closeDay}, khung giờ hàng ngày: ${cfg.dailyOpenTime} - ${cfg.dailyCloseTime}).`
      : `Bài test đang mở từ ngày ${openDay} đến hết ngày ${closeDay} tháng này.`,
    deadline: deadlineDate,
    cfg,
  };
}
