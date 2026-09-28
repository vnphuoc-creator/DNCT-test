// Hàm dùng chung để trộn ngẫu nhiên và bốc câu hỏi CHIA ĐỀU theo từng chủ đề (category).
// Được dùng ở cả trang làm bài (random riêng cho từng người) và trang Cài đặt hệ thống
// (khi tạo sẵn các "bộ đề" cố định).

export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Bốc câu hỏi CHIA ĐỀU theo từng chủ đề (category), thay vì random thuần —
// tránh việc hệ nào có nhiều câu trong kho sẽ chiếm phần lớn bài test.
// Cách làm: trộn ngẫu nhiên câu hỏi trong từng chủ đề, rồi lấy lần lượt
// "vòng tròn" mỗi chủ đề 1 câu cho tới khi đủ số lượng cần thiết.
export function pickEvenlyAcrossCategories(allQuestions, count) {
  const byCategory = {};
  for (const q of allQuestions) {
    const key = q.category || "Khác";
    if (!byCategory[key]) byCategory[key] = [];
    byCategory[key].push(q);
  }
  const categoryKeys = shuffle(Object.keys(byCategory));
  const shuffledGroups = categoryKeys.map((key) => shuffle(byCategory[key]));

  const picked = [];
  let round = 0;
  while (picked.length < count) {
    let addedThisRound = false;
    for (const group of shuffledGroups) {
      if (picked.length >= count) break;
      if (group[round]) {
        picked.push(group[round]);
        addedThisRound = true;
      }
    }
    if (!addedThisRound) break; // hết sạch câu hỏi ở mọi chủ đề
    round += 1;
  }
  return shuffle(picked); // trộn lại thứ tự cuối cùng để không lộ theo nhóm
}
