// Trình phân tích câu hỏi MCQ từ PDF/DOCX.
// Định dạng khuyến nghị:
// 1. Nội dung câu hỏi
// A. Đáp án A
// B. Đáp án B
// C. Đáp án C
// D. Đáp án D
// Đáp án: B
// (có thể thêm "Giải thích: ...")
export function parseQuestionsFromText(rawText, category) {
  const text = String(rawText || "")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  const blocks = text.split(/\n(?=\s*(?:Câu\s*)?\d+\s*[\.\):\-])/i).map((x) => x.trim()).filter(Boolean);
  const result = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((x) => x.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    let first = lines[0].replace(/^(?:Câu\s*)?\d+\s*[\.\):\-]\s*/i, "").trim();
    if (!first) continue;

    const optionLines = [];
    let answerIndex = null;
    let explanation = "";
    let currentOption = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const ans = line.match(/^(?:Đáp\s*án|Đáp án đúng|Answer|Correct answer)\s*[:\-]?\s*([A-F])\b/i);
      if (ans) {
        answerIndex = ans[1].toUpperCase().charCodeAt(0) - 65;
        continue;
      }
      const exp = line.match(/^(?:Giải\s*thích|Explanation)\s*[:\-]?\s*(.*)$/i);
      if (exp) {
        explanation = exp[1].trim();
        continue;
      }
      const opt = line.match(/^([A-F])[\.\):\-]\s*(.+)$/i);
      if (opt) {
        currentOption = opt[1].toUpperCase();
        optionLines.push({ letter: currentOption, text: opt[2].trim() });
      } else if (currentOption && optionLines.length) {
        optionLines[optionLines.length - 1].text += " " + line;
      }
    }

    if (optionLines.length < 2 || answerIndex === null || answerIndex >= optionLines.length) continue;
    result.push({
      question_text: first,
      options: optionLines.map((o) => o.text),
      correct_index: answerIndex,
      category: category || null,
      explanation: explanation || null,
    });
  }

  return result;
}
