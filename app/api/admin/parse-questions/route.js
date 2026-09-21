import { NextResponse } from "next/server";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { FIXED_CATEGORIES } from "../../../../lib/categories";

const pdfParse = require("pdf-parse");

// Hàm tự động đoán chủ đề / hệ dựa trên từ khóa trong câu hỏi nếu người dùng không chọn cố định 1 hệ
function detectCategoryFromText(text) {
  if (!text) return "Hệ thống hạ thế";
  const lower = text.toLowerCase();

  if (lower.includes("trung thế") || lower.includes("22kv") || lower.includes("máy cắt trung thế") || lower.includes("rmu") || lower.includes("recloser")) {
    return "Hệ thống trung thế";
  }
  if (lower.includes("máy phát") || lower.includes("generator") || lower.includes("ats") || lower.includes("dầu diesel") || lower.includes("cummins")) {
    return "Hệ thống máy phát";
  }
  if (lower.includes("ups") || lower.includes("ắc quy") || lower.includes("inverter") || lower.includes("bypass") || lower.includes("sts")) {
    return "Hệ UPS";
  }
  if (lower.includes("xlnt") || lower.includes("nước thải") || lower.includes("bùn vi sinh") || lower.includes("sục khí") || lower.includes("aerotank") || lower.includes("clo")) {
    return "Hệ thống XLNT";
  }
  if (lower.includes("nước cấp") || lower.includes("bơm tăng áp") || lower.includes("áp lực nước") || lower.includes("bể ngầm") || lower.includes("đồng hồ nước")) {
    return "Hệ nước cấp";
  }
  if (lower.includes("ro") || lower.includes("màng lọc") || lower.includes("thẩm thấu ngược") || lower.includes("tds") || lower.includes("lọc tinh")) {
    return "Hệ thống RO";
  }
  if (lower.includes("tiểu cảnh") || lower.includes("liftpit") || lower.includes("hố thu") || lower.includes("bơm chìm")) {
    return "Hệ bơm tiểu cảnh và bơm Liftpit";
  }
  if (lower.includes("mái nhà ga") || lower.includes("mương thoát") || lower.includes("siphonic") || lower.includes("mưa bão") || lower.includes("phễu thu")) {
    return "Hệ thoát nước mái nhà ga và mương thoát nước";
  }
  if (lower.includes("chiếu sáng") || lower.includes("đèn led") || lower.includes("lux") || lower.includes("emergency") || lower.includes("exit")) {
    return "Hệ thống chiếu sáng";
  }
  if (lower.includes("chống sét") || lower.includes("kim thu sét") || lower.includes("đèn báo không") || lower.includes("điện trở tiếp địa") || lower.includes("bảo vệ quá áp")) {
    return "Hệ thống chống sét và đèn báo không";
  }
  if (lower.includes("quầy thuê") || lower.includes("mặt bằng") || lower.includes("tenant") || lower.includes("f&b") || lower.includes("đấu nối quầy")) {
    return "An toàn điện nước quầy thuê";
  }
  if (lower.includes("thiết bị vệ sinh") || lower.includes("van xả") || lower.includes("vòi cảm ứng") || lower.includes("bồn cầu") || lower.includes("tiểu nam")) {
    return "Thiết bị vệ sinh";
  }
  if (lower.includes("biểu mẫu") || lower.includes("nhật ký") || lower.includes("phiếu công tác") || lower.includes("lịch làm việc") || lower.includes("giao ca")) {
    return "Các biểu mẫu đăng ký, lịch làm việc, hồ sơ";
  }
  if (lower.includes("5s") || lower.includes("sàng lọc") || lower.includes("sắp xếp") || lower.includes("sạch sẽ") || lower.includes("săn sóc") || lower.includes("sẵn sàng")) {
    return "5S";
  }
  if (lower.includes("hạ thế") || lower.includes("mcb") || lower.includes("mccb") || lower.includes("acb") || lower.includes("tủ điện") || lower.includes("dây dẫn") || lower.includes("tiếp địa")) {
    return "Hệ thống hạ thế";
  }

  return "Hệ thống hạ thế";
}

// Bộ phân tích câu hỏi dạng text thông minh
function parseQuestionsFromRawText(rawText, defaultCategory = "") {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const questions = [];

  let currentQ = null;

  // Regex phát hiện dòng bắt đầu câu hỏi mới: Câu 1, Câu 1:, 1., 1/, Question 1...
  const qStartRegex = /^(?:câu|cau|question|\#)?\s*(\d+)[\.\:\)\/\-]\s*(.*)$/i;
  // Regex phát hiện phương án A, B, C, D
  const optRegex = /^([A-D|a-d])[\.\:\)\/\-]\s*(.*)$/;
  // Regex phát hiện đáp án: Đáp án: A, Đ/A: B, Key: C, Answer: D...
  const ansRegex = /^(?:đáp án|dap an|đ\/a|d\/a|key|answer|ans)[\:\s\-]+([A-D|a-d])/i;
  // Regex phát hiện giải thích
  const expRegex = /^(?:giải thích|giai thich|explanation|note)[\:\s\-]+(.*)$/i;

  function finalizeCurrentQuestion() {
    if (!currentQ || !currentQ.question_text) return;
    if (currentQ.options.length < 2) return;

    // Đảm bảo có ít nhất 2 phương án
    const cleanedOptions = currentQ.options.map((o) => o.trim()).filter(Boolean);
    if (cleanedOptions.length < 2) return;

    // Xác định chủ đề
    const category = defaultCategory && defaultCategory !== "auto"
      ? defaultCategory
      : detectCategoryFromText(currentQ.question_text);

    questions.push({
      question_text: currentQ.question_text.trim(),
      options: cleanedOptions,
      correct_index: currentQ.correct_index >= 0 && currentQ.correct_index < cleanedOptions.length ? currentQ.correct_index : 0,
      category,
      explanation: currentQ.explanation ? currentQ.explanation.trim() : "",
      image_url: "",
    });
    currentQ = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Kiểm tra dòng đáp án (Đáp án: A)
    const ansMatch = line.match(ansRegex);
    if (ansMatch && currentQ) {
      const letter = ansMatch[1].toUpperCase();
      const idx = letter.charCodeAt(0) - 65; // A -> 0, B -> 1, C -> 2, D -> 3
      if (idx >= 0 && idx < 10) {
        currentQ.correct_index = idx;
      }
      continue;
    }

    // Kiểm tra dòng giải thích
    const expMatch = line.match(expRegex);
    if (expMatch && currentQ) {
      currentQ.explanation = expMatch[1];
      continue;
    }

    // Kiểm tra bắt đầu câu hỏi mới
    const qMatch = line.match(qStartRegex);
    if (qMatch) {
      finalizeCurrentQuestion();
      currentQ = {
        question_text: qMatch[2] || "",
        options: [],
        correct_index: 0,
        explanation: "",
      };
      continue;
    }

    // Kiểm tra phương án A, B, C, D
    const optMatch = line.match(optRegex);
    if (optMatch && currentQ) {
      const letter = optMatch[1].toUpperCase();
      const optText = optMatch[2] || "";
      const isMarkedCorrect = line.includes("*") || line.toLowerCase().includes("(đúng)");
      
      const cleanOptText = optText.replace(/\*|\(đúng\)|\(dung\)/gi, "").trim();
      currentQ.options.push(cleanOptText);

      if (isMarkedCorrect) {
        currentQ.correct_index = currentQ.options.length - 1;
      }
      continue;
    }

    // Nếu không khớp các mẫu trên:
    // Nếu đang trong câu hỏi nhưng chưa có options nào -> Nối thêm text vào question_text
    if (currentQ && currentQ.options.length === 0) {
      currentQ.question_text += " " + line;
    } else if (currentQ && currentQ.options.length > 0) {
      // Nếu đã có options -> Có thể là dòng giải thích tiếp theo hoặc nối thêm option cuối
      const lastIdx = currentQ.options.length - 1;
      currentQ.options[lastIdx] += " " + line;
    }
  }

  finalizeCurrentQuestion();

  return questions;
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const chosenCategory = formData.get("category") || "";

    if (!file) {
      return NextResponse.json({ error: "Chưa chọn file để tải lên." }, { status: 400 });
    }

    const fileName = file.name || "upload";
    const fileExt = fileName.split(".").pop().toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";
    let parsedQuestions = [];

    // 1. File Word .docx
    if (fileExt === "docx") {
      const mammothResult = await mammoth.extractRawText({ buffer });
      extractedText = mammothResult.value || "";
      parsedQuestions = parseQuestionsFromRawText(extractedText, chosenCategory);
    }
    // 2. File PDF .pdf
    else if (fileExt === "pdf") {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text || "";
      parsedQuestions = parseQuestionsFromRawText(extractedText, chosenCategory);
    }
    // 3. File Excel .xlsx / .xls
    else if (fileExt === "xlsx" || fileExt === "xls") {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Tìm cột câu hỏi, A, B, C, D, Đáp án đúng, Chủ đề
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const qText = String(row[0] || "").trim();
        if (!qText) continue;

        const optA = String(row[1] || "").trim();
        const optB = String(row[2] || "").trim();
        const optC = String(row[3] || "").trim();
        const optD = String(row[4] || "").trim();
        const ansRaw = String(row[5] || "A").trim().toUpperCase();
        const rowCategory = String(row[6] || "").trim();
        const explanation = String(row[7] || "").trim();

        const opts = [optA, optB, optC, optD].filter(Boolean);
        if (opts.length < 2) continue;

        let correctIdx = 0;
        if (ansRaw === "B" || ansRaw === "1") correctIdx = 1;
        else if (ansRaw === "C" || ansRaw === "2") correctIdx = 2;
        else if (ansRaw === "D" || ansRaw === "3") correctIdx = 3;

        const finalCat = chosenCategory && chosenCategory !== "auto"
          ? chosenCategory
          : rowCategory || detectCategoryFromText(qText);

        parsedQuestions.push({
          question_text: qText,
          options: opts,
          correct_index: Math.min(correctIdx, opts.length - 1),
          category: finalCat,
          explanation,
          image_url: "",
        });
      }
    }
    // 4. File Text .txt
    else {
      extractedText = buffer.toString("utf-8");
      parsedQuestions = parseQuestionsFromRawText(extractedText, chosenCategory);
    }

    if (parsedQuestions.length === 0) {
      return NextResponse.json({
        error: `Không bóc tách được câu hỏi nào từ file "${fileName}". Vui lòng kiểm tra định dạng file (Cần có cấu trúc: "Câu 1: ...", "A. ...", "B. ...", "Đáp án: A").`,
        rawPreview: extractedText.slice(0, 500),
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      fileName,
      totalCount: parsedQuestions.length,
      categoryApplied: chosenCategory || "Tự động phân loại",
      questions: parsedQuestions,
    });
  } catch (err) {
    console.error("Lỗi parse-questions API:", err);
    return NextResponse.json({ error: "Lỗi xử lý file: " + err.message }, { status: 500 });
  }
}
