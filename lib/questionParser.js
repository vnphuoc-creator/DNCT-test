// Phân tích nội dung text (đã trích xuất từ file PDF/Word) thành danh sách câu hỏi trắc nghiệm.
//
// ĐỊNH DẠNG KHUYẾN NGHỊ trong file nguồn (mỗi câu 1 khối, cách nhau bằng dòng trống):
//
//   Câu 1: Nội dung câu hỏi ở đây?
//   A. Đáp án 1
//   B. Đáp án 2
//   C. Đáp án 3
//   D. Đáp án 4
//   Đáp án đúng: B
//
// Hệ thống cũng nhận diện được các biến thể phổ biến:
//   - "Câu 1." / "Câu 1)" / "Question 1:" / chỉ số "1." ở đầu dòng
//   - Đáp án đánh dấu bằng dấu (*) ngay trước/sau, ví dụ "*B. Đáp án 2" hoặc "B. Đáp án 2 (*)"
//   - Dòng "Đáp án: B" / "Đáp án đúng: B" / "Answer: B" ở cuối khối
// Nếu không xác định được đáp án đúng, câu hỏi vẫn được đưa vào danh sách xem trước nhưng có
// cờ "needsReview" để admin tự chọn lại đáp án đúng trước khi lưu vào ngân hàng câu hỏi.

const QUESTION_START_RE = /^(?:câu|question|q)\s*\.?\s*(\d+)\s*[.:)]/i;
const OPTION_RE = /^\(?\*?\)?\s*([A-Fa-f])\s*[.:)]\s*(.+)$/;
const ANSWER_LINE_RE = /^(?:đáp\s*án(?:\s*đúng)?|answer|correct)\s*[.:)]?\s*([A-Fa-f])\b/i;
const INLINE_MARK_RE = /(\*|\(\s*đúng\s*\)|\(\s*correct\s*\)|✓|✔)/i;

function stripInlineMarks(text) {
  return text.replace(INLINE_MARK_RE, "").trim();
}

function letterToIndex(letter) {
  return letter.toUpperCase().charCodeAt(0) - 65; // A -> 0, B -> 1, ...
}

// Tách text thành các khối, mỗi khối bắt đầu bằng 1 dòng "Câu N..."
function splitIntoBlocks(text) {
  const lines = text.split(/\r\n|\r|\n/);
  const blocks = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const m = line.match(QUESTION_START_RE);
    if (m) {
      if (current) blocks.push(current);
      current = { number: m[1], lines: [line.replace(QUESTION_START_RE, "").trim()] };
    } else if (current) {
      current.lines.push(line);
    }
    // Các dòng xuất hiện trước câu hỏi đầu tiên (tiêu đề file, hướng dẫn...) bị bỏ qua.
  }
  if (current) blocks.push(current);
  return blocks;
}

function parseBlock(block) {
  const questionParts = [];
  const options = [];
  let correctIndex = -1;
  let explicitAnswerLetter = null;

  for (const line of block.lines) {
    const answerMatch = line.match(ANSWER_LINE_RE);
    if (answerMatch) {
      explicitAnswerLetter = answerMatch[1].toUpperCase();
      continue;
    }

    const optionMatch = line.match(OPTION_RE);
    if (optionMatch) {
      const letter = optionMatch[1].toUpperCase();
      const hasMark = INLINE_MARK_RE.test(line);
      const optionText = stripInlineMarks(optionMatch[2]);
      const index = letterToIndex(letter);
      options[index] = optionText;
      if (hasMark) correctIndex = index;
      continue;
    }

    if (options.length === 0) {
      // Chưa gặp đáp án nào -> vẫn đang là phần nội dung câu hỏi (có thể nhiều dòng)
      questionParts.push(line);
    }
  }

  if (explicitAnswerLetter) {
    correctIndex = letterToIndex(explicitAnswerLetter);
  }

  const question_text = questionParts.join(" ").trim();
  const cleanedOptions = [];
  for (let i = 0; i < options.length; i++) {
    cleanedOptions.push(options[i] || "");
  }

  const hasEnoughOptions = cleanedOptions.filter((o) => o.trim()).length >= 2;
  const validCorrectIndex = correctIndex >= 0 && correctIndex < cleanedOptions.length && cleanedOptions[correctIndex];

  return {
    question_text,
    options: cleanedOptions,
    correct_index: validCorrectIndex ? correctIndex : 0,
    needsReview: !question_text || !hasEnoughOptions || !validCorrectIndex,
    warning: !question_text
      ? "Không đọc được nội dung câu hỏi."
      : !hasEnoughOptions
      ? "Chưa đủ đáp án (cần ít nhất 2)."
      : !validCorrectIndex
      ? "Không xác định được đáp án đúng — vui lòng chọn lại."
      : "",
  };
}

export function parseQuestionsFromText(text) {
  const blocks = splitIntoBlocks(text || "");
  return blocks
    .map(parseBlock)
    .filter((q) => q.question_text || q.options.some((o) => o.trim()));
}
