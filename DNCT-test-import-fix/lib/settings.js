import { supabase } from "./supabaseClient";

// Giá trị mặc định dùng chung cho các API/route cũ và giao diện quản trị.
// Các giá trị trong Supabase (app_settings) luôn được ưu tiên hơn các mặc định này.
export const DEFAULT_SETTINGS = {
  quiz_override_open: "false",
  quiz_open_day: "27",
  quiz_close_day: "30",
  quiz_open_time: "00:00",
  quiz_close_time: "23:59",
  quiz_questions_count: "25",
  quiz_pass_threshold: "80",
  quiz_mode: "random",
  quiz_active_set_id: "",
};

// Đọc toàn bộ cài đặt hệ thống, trả về dạng { key: value }.
// Nếu lỗi (ví dụ bảng chưa được tạo), trả về object rỗng — các nơi gọi hàm này
// đều có giá trị mặc định dự phòng, nên không làm sập app.
export async function getSettings() {
  try {
    const { data, error } = await supabase.from("app_settings").select("key, value");
    if (error || !data) return {};
    const map = {};
    for (const row of data) map[row.key] = row.value;
    return map;
  } catch {
    return {};
  }
}

export async function updateSetting(key, value) {
  return supabase
    .from("app_settings")
    .upsert({ key, value: String(value), updated_at: new Date().toISOString() });
}
