// "Kỳ" (period) dùng để tách bài test theo từng tháng, dạng "YYYY-MM", ví dụ "2026-08".
// Nhờ vậy, mỗi khi sang tháng mới, hệ thống tự coi như một đợt thi mới:
// - Người đã làm bài tháng trước vẫn được làm lại vào tháng sau (không bị báo trùng tên)
// - Báo cáo mặc định chỉ hiện dữ liệu của tháng đang chọn
// Không cần xoá dữ liệu cũ — lịch sử các tháng trước vẫn được giữ nguyên trong database.
export function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function formatPeriodLabel(period) {
  if (!period) return "Không rõ tháng";
  const [year, month] = period.split("-");
  return `Tháng ${parseInt(month, 10)}/${year}`;
}
