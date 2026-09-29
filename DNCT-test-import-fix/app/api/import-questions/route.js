import { NextResponse } from "next/server";
import { parseQuestionsFromText } from "../../../lib/questionParser";

// pdf-parse / mammoth dùng API Node.js (Buffer, fs...) nên bắt buộc chạy ở Node runtime,
// không chạy được ở Edge runtime.
export const runtime = "nodejs";

function isAuthed(request) {
  return request.cookies.get("admin_auth")?.value === "1";
}

export async function POST(request) {
  if (!isAuthed(request)) {
    return NextResponse.json({ ok: false, message: "Chưa đăng nhập admin." }, { status: 401 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Không đọc được file gửi lên." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ ok: false, message: "Chưa chọn file." }, { status: 400 });
  }

  const fileName = file.name || "";
  const ext = fileName.split(".").pop().toLowerCase();

  if (!["pdf", "doc", "docx"].includes(ext)) {
    return NextResponse.json(
      { ok: false, message: "Chỉ hỗ trợ file PDF (.pdf) hoặc Word (.doc, .docx)." },
      { status: 400 }
    );
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ ok: false, message: "File quá lớn (tối đa 20MB)." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let rawText = "";
  try {
    if (ext === "pdf") {
      // import động để tránh lỗi build khi thư viện cố đọc file test lúc load module ở môi
      // trường không phù hợp — chỉ khởi tạo khi thực sự có request xử lý PDF.
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      rawText = data.text || "";
    } else {
      // .doc / .docx — mammoth hỗ trợ tốt nhất định dạng .docx (Word hiện đại)
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value || "";
    }
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Không đọc được nội dung file (" +
          (err?.message || "lỗi không xác định") +
          "). Với file .doc cũ, hãy thử lưu lại thành .docx rồi import lại.",
      },
      { status: 500 }
    );
  }

  if (!rawText.trim()) {
    return NextResponse.json(
      { ok: false, message: "File không có nội dung văn bản đọc được (có thể là file scan ảnh)." },
      { status: 400 }
    );
  }

  const questions = parseQuestionsFromText(rawText);

  if (questions.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Không nhận diện được câu hỏi nào trong file. Hãy kiểm tra định dạng: mỗi câu bắt đầu bằng 'Câu 1:', các đáp án ghi 'A. ...', 'B. ...' và có dòng 'Đáp án đúng: B'.",
      },
      { status: 422 }
    );
  }

  return NextResponse.json({
    ok: true,
    questions,
    needsReviewCount: questions.filter((q) => q.needsReview).length,
  });
}
