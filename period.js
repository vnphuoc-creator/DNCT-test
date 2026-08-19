// "Kỳ" (period) dùng để tách bài test theo từng ĐỢT, không phải theo lịch tháng thông thường.
//
// Dùng chung biến NEXT_PUBLIC_QUIZ_OPEN_DAY (biến đã có sẵn để khoá lịch mở bài test) làm luôn
// mốc bắt đầu 1 kỳ mới — vì 2 việc này về bản chất phải khớp nhau: kỳ mới chỉ nên bắt đầu đúng
// lúc bài test thật sự mở lại.
//
// Ví dụ NEXT_PUBLIC_QUIZ_OPEN_DAY = 25:
//   - Từ 25/8 đến hết 24/9  -> tất cả tính chung 1 kỳ, nhãn "2026-08"
//   - Từ 25/9 đến hết 24/10 -> kỳ mới, nhãn "2026-09"
// Nhờ vậy, ai lỡ vào làm bài trước ngày 25 (ví dụ do link mở sớm) vẫn được tính vào ĐÚNG kỳ
// trước đó — không bị chặn "đã làm rồi" một khi kỳ mới (từ ngày 25) thật sự bắt đầu.
//
// Nếu không đặt biến NEXT_PUBLIC_QUIZ_OPEN_DAY, hệ thống quay về cách tính cũ: 1 kỳ = 1 tháng
// lịch bình thường (bắt đầu từ ngày 1).
function getCutoffDay() {
  const raw = process.env.NEXT_PUBLIC_QUIZ_OPEN_DAY;
  const parsed = raw ? parseInt(raw, 10) : 1;
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 28 ? parsed : 1;
}

export function getCurrentPeriod() {
  const cutoffDay = getCutoffDay();
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-based (0 = Tháng 1)

  if (now.getDate() < cutoffDay) {
    // Chưa tới ngày mở kỳ mới trong tháng này -> vẫn thuộc kỳ bắt đầu từ tháng trước
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }

  const mm = String(month + 1).padStart(2, "0");
  return `${year}-${mm}`;
}

export function formatPeriodLabel(period) {
  if (!period) return "Không rõ kỳ";
  const [year, month] = period.split("-");
  const cutoffDay = getCutoffDay();
  if (cutoffDay > 1) {
    return `Kỳ từ ${cutoffDay}/${parseInt(month, 10)}/${year}`;
  }
  return `Tháng ${parseInt(month, 10)}/${year}`;
}
