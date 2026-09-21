// Quản lý các Bộ đề thi (10 bộ đề mẫu có sẵn + cho phép tạo thêm không giới hạn).
// Cho phép quản trị viên chọn 1 bộ đề cụ thể gửi cho nhân sự làm bài, hoặc chọn chế độ ngẫu nhiên.

export const DEFAULT_EXAM_SETS = [
  {
    id: "set-01",
    code: "ĐỀ-01",
    name: "Bộ đề số 01: Tổng hợp Toàn diện Điện & Nước AHT",
    description: "Kiểm tra toàn diện tất cả các hệ thống trọng yếu: Trung thế, Hạ thế, Máy phát, UPS, Cấp nước, Thoát nước và 5S.",
    questionCount: 25,
    focusCategories: ["Hệ thống trung thế", "Hệ thống hạ thế", "Hệ thống máy phát", "Hệ UPS", "Hệ nước cấp", "5S"],
    created_at: "2026-09-01T08:00:00.000Z",
    isDefault: true,
  },
  {
    id: "set-02",
    code: "ĐỀ-02",
    name: "Bộ đề số 02: Trọng tâm Trạm Trung thế, Hạ thế & Máy phát",
    description: "Chuyên sâu quy trình vận hành an toàn trạm biến áp, tủ phân phối MSB, hòa đồng bộ máy phát điện Cummins/Caterpillar.",
    questionCount: 25,
    focusCategories: ["Hệ thống trung thế", "Hệ thống hạ thế", "Hệ thống máy phát"],
    created_at: "2026-09-02T08:00:00.000Z",
    isDefault: true,
  },
  {
    id: "set-03",
    code: "ĐỀ-03",
    name: "Bộ đề số 03: Hệ nguồn bảo đảm UPS & Nguồn ưu tiên Nhà ga",
    description: "Kiểm tra kiến thức tủ STS, chuyển mạch bypass UPS, ắc quy chì kín khí, phân phối nguồn thiết bị an ninh hàng không.",
    questionCount: 25,
    focusCategories: ["Hệ UPS", "Hệ thống hạ thế", "Hệ thống chiếu sáng"],
    created_at: "2026-09-03T08:00:00.000Z",
    isDefault: true,
  },
  {
    id: "set-04",
    code: "ĐỀ-04",
    name: "Bộ đề số 04: Hệ thống Cấp nước, Lọc nước RO & Bơm tăng áp",
    description: "Vận hành cụm bơm biến tần cấp nước sạch, trạm xử lý nước RO tinh khiết, kiểm soát áp lực mạng lưới cấp nước.",
    questionCount: 25,
    focusCategories: ["Hệ nước cấp", "Hệ thống RO", "Hệ bơm tiểu cảnh và bơm Liftpit"],
    created_at: "2026-09-04T08:00:00.000Z",
    isDefault: true,
  },
  {
    id: "set-05",
    code: "ĐỀ-05",
    name: "Bộ đề số 05: Trạm Xử lý Nước thải (XLNT) & Thoát nước Mưa",
    description: "Quy trình công nghệ xử lý vi sinh, bơm định lượng hóa chất, quan trắc tự động và thoát nước mái nhà ga mùa mưa bão.",
    questionCount: 25,
    focusCategories: ["Hệ thống XLNT", "Hệ thoát nước mái nhà ga và mương thoát nước"],
    created_at: "2026-09-05T08:00:00.000Z",
    isDefault: true,
  },
  {
    id: "set-06",
    code: "ĐỀ-06",
    name: "Bộ đề số 06: Chiếu sáng Nhà ga, Chống sét & Đèn Báo không",
    description: "Hệ thống chiếu sáng sân đỗ, chiếu sáng khẩn cấp, kim thu sét phát tia tiên đạo ESE, đèn báo không chướng ngại vật hàng không.",
    questionCount: 25,
    focusCategories: ["Hệ thống chiếu sáng", "Hệ thống chống sét và đèn báo không"],
    created_at: "2026-09-06T08:00:00.000Z",
    isDefault: true,
  },
  {
    id: "set-07",
    code: "ĐỀ-07",
    name: "Bộ đề số 07: An toàn Điện - Nước Mặt bằng Quầy thuê & Khách thuê",
    description: "Kiểm tra nghiệm thu đấu nối điện nước quầy F&B, nhà hàng, quầy bán lẻ, kiểm soát an toàn PCCC và rò rỉ nước ngầm.",
    questionCount: 25,
    focusCategories: ["An toàn điện nước quầy thuê", "Hệ thống hạ thế", "Hệ nước cấp"],
    created_at: "2026-09-07T08:00:00.000Z",
    isDefault: true,
  },
  {
    id: "set-08",
    code: "ĐỀ-08",
    name: "Bộ đề số 08: Tiêu chuẩn 5S, Biểu mẫu Nhật ký & Hồ sơ Vận hành",
    description: "Kiểm tra thực hành 5S tại phòng kỹ thuật, ghi chép nhật ký ca trực, phiếu công tác, quy trình giao nhận ca Đội ĐNCT.",
    questionCount: 25,
    focusCategories: ["5S", "Các biểu mẫu đăng ký, lịch làm việc, hồ sơ"],
    created_at: "2026-09-08T08:00:00.000Z",
    isDefault: true,
  },
  {
    id: "set-09",
    code: "ĐỀ-09",
    name: "Bộ đề số 09: Xử lý Tình huống Sự cố Khẩn cấp Điện - Nước Nhà ga",
    description: "Phương án ứng phó mất điện lưới diện rộng, vỡ đường ống cấp nước chính, ngập úng tầng hầm, cháy nổ tủ điện hạ thế.",
    questionCount: 25,
    focusCategories: ["Hệ thống trung thế", "Hệ thống máy phát", "Hệ nước cấp", "Hệ bơm tiểu cảnh và bơm Liftpit"],
    created_at: "2026-09-09T08:00:00.000Z",
    isDefault: true,
  },
  {
    id: "set-10",
    code: "ĐỀ-10",
    name: "Bộ đề số 10: Đánh giá Năng lực Kỹ thuật viên Định kỳ",
    description: "Đề thi chuẩn hóa kiến thức định kỳ hằng tháng dành cho toàn thể nhân sự Đội Điện - Nước & Cơ sở hạ tầng AHT.",
    questionCount: 25,
    focusCategories: ["Hệ thống trung thế", "Hệ thống hạ thế", "Hệ thống máy phát", "Hệ UPS", "Hệ nước cấp", "Hệ thống XLNT", "5S"],
    created_at: "2026-09-10T08:00:00.000Z",
    isDefault: true,
  },
];

const SETS_STORAGE_KEY = "aht_quiz_exam_sets";

export function getLocalExamSets() {
  if (typeof window === "undefined") return DEFAULT_EXAM_SETS;
  try {
    const raw = localStorage.getItem(SETS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Lỗi đọc exam_sets:", e);
  }
  return DEFAULT_EXAM_SETS;
}

export function saveLocalExamSets(sets) {
  if (typeof window === "undefined") return sets;
  try {
    localStorage.setItem(SETS_STORAGE_KEY, JSON.stringify(sets));
  } catch (e) {
    console.error("Lỗi lưu exam_sets:", e);
  }
  return sets;
}

/**
 * Thuật toán chọn câu hỏi theo bộ đề từ ngân hàng câu hỏi
 */
export function selectQuestionsForSet(allQuestions, examSet, count = 25) {
  if (!allQuestions || allQuestions.length === 0) return [];
  if (!examSet) return allQuestions.slice(0, count);

  // Nếu bộ đề có danh sách question_ids cụ thể được gán sẵn
  if (Array.isArray(examSet.question_ids) && examSet.question_ids.length > 0) {
    const idSet = new Set(examSet.question_ids);
    const matched = allQuestions.filter((q) => idSet.has(q.id));
    if (matched.length >= count) {
      return matched.slice(0, count);
    }
    // Nếu chưa đủ, bù thêm từ các câu hỏi khác
    const remaining = allQuestions.filter((q) => !idSet.has(q.id));
    return [...matched, ...remaining].slice(0, count);
  }

  // Nếu bộ đề định nghĩa focusCategories
  const categories = examSet.focusCategories || [];
  if (categories.length > 0) {
    const priorityQuestions = allQuestions.filter((q) => categories.includes(q.category));
    const otherQuestions = allQuestions.filter((q) => !categories.includes(q.category));

    // Dùng deterministic pseudo-random dựa trên mã đề để mọi người thi cùng bộ đề có cùng câu hỏi
    const seed = examSet.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const shuffledPriority = deterministicShuffle(priorityQuestions, seed);
    const shuffledOthers = deterministicShuffle(otherQuestions, seed + 1);

    const combined = [...shuffledPriority, ...shuffledOthers];
    return combined.slice(0, count);
  }

  return allQuestions.slice(0, count);
}

function deterministicShuffle(array, seed) {
  const copy = [...array];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const rnd = s / 233280;
    const j = Math.floor(rnd * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
