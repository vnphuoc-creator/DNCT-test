import { supabase } from "./supabaseClient";

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
