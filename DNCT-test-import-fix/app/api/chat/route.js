import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Chatbot tra cứu ngân hàng câu hỏi — công khai cho mọi người dùng, KHÔNG truy cập
// bảng kết quả/điểm số của bất kỳ ai (chỉ đọc bảng `questions`, vốn đã công khai
// sẵn khi mọi người vào trang Ôn tập).
//
// Cách hoạt động: tìm trước một số câu hỏi liên quan tới nội dung người dùng hỏi
// (dựa theo từ khoá), rồi đưa các câu đó làm "ngữ cảnh" cho AI trả lời — để AI
// không bịa ra câu hỏi/đáp án không có thật trong ngân hàng câu hỏi.
//
// Cần biến môi trường ANTHROPIC_API_KEY (bí mật, không có tiền tố NEXT_PUBLIC_).

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function searchRelevantQuestions(message) {
  // Tách từ khoá đơn giản: bỏ các từ quá ngắn/từ nối phổ biến
  const stopWords = new Set([
    "là", "gì", "của", "và", "có", "được", "cho", "trong", "với", "các",
    "khi", "để", "như", "thế", "nào", "hỏi", "câu", "về", "một", "bao",
    "nhiêu", "sao", "làm", "ơi", "bạn", "tôi", "mình", "tìm", "kiếm",
  ]);
  const words = message
    .toLowerCase()
    .replace(/[?.,!;:]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  if (words.length === 0) {
    // Câu hỏi quá ngắn/chung chung — lấy tạm 1 ít câu hỏi bất kỳ để AI biết phạm vi dữ liệu
    const { data } = await supabaseAdmin.from("questions").select("question_text, options, correct_index, category, explanation").limit(8);
    return data || [];
  }

  const orFilter = words.slice(0, 6).map((w) => `question_text.ilike.%${w}%,category.ilike.%${w}%`).join(",");
  const { data, error } = await supabaseAdmin
    .from("questions")
    .select("question_text, options, correct_index, category, explanation")
    .or(orFilter)
    .limit(12);

  if (error || !data || data.length === 0) {
    const { data: fallback } = await supabaseAdmin
      .from("questions")
      .select("question_text, options, correct_index, category, explanation")
      .limit(8);
    return fallback || [];
  }
  return data;
}

export async function POST(request) {
  try {
    const { message, history } = await request.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ ok: false, message: "Thiếu nội dung câu hỏi." }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { ok: false, message: "Chatbot chưa được cấu hình (thiếu ANTHROPIC_API_KEY trên server)." },
        { status: 500 }
      );
    }

    const relevant = await searchRelevantQuestions(message);

    const contextText = relevant
      .map((q, i) => {
        const opts = (q.options || []).map((o, idx) => `${String.fromCharCode(65 + idx)}. ${o}`).join(" | ");
        const correctLetter = String.fromCharCode(65 + (q.correct_index ?? 0));
        return `${i + 1}. [${q.category || "Không rõ chủ đề"}] ${q.question_text}\n   Đáp án: ${opts}\n   Đúng: ${correctLetter}${q.explanation ? `\n   Giải thích: ${q.explanation}` : ""}`;
      })
      .join("\n\n");

    const systemPrompt = `Bạn là trợ lý tra cứu ngân hàng câu hỏi ôn tập kiến thức nội bộ công ty (kỹ thuật vận hành: điện, UPS, bơm, XLNT, 5S...).

Dưới đây là một số câu hỏi có liên quan tới câu hỏi của người dùng, trích từ ngân hàng câu hỏi thật:

${contextText || "(Không tìm thấy câu hỏi nào khớp trực tiếp — hãy nói rõ với người dùng là bạn không tìm thấy trong ngân hàng câu hỏi, đừng bịa ra câu hỏi mới.)"}

QUY TẮC:
- CHỈ trả lời dựa trên các câu hỏi được liệt kê ở trên. Không được bịa thêm câu hỏi, đáp án, hay chủ đề không có trong danh sách này.
- Nếu người dùng hỏi điều gì đó không có trong danh sách trên, thành thật nói rằng bạn không tìm thấy trong ngân hàng câu hỏi hiện có, không đoán mò.
- Trả lời ngắn gọn, rõ ràng, bằng tiếng Việt.
- Nếu người dùng hỏi đáp án của 1 câu cụ thể, có thể nói đáp án đúng kèm giải thích ngắn (nếu có).
- Giữ giọng văn thân thiện, đúng vai trò trợ lý học tập nội bộ.`;

    const messages = [
      ...(Array.isArray(history) ? history.slice(-6) : []),
      { role: "user", content: message },
    ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ ok: false, message: "Lỗi gọi AI: " + errText }, { status: 500 });
    }

    const data = await response.json();
    const answer = data.content?.find((b) => b.type === "text")?.text || "Xin lỗi, mình chưa trả lời được câu này.";

    return NextResponse.json({ ok: true, answer });
  } catch (err) {
    return NextResponse.json({ ok: false, message: String(err) }, { status: 500 });
  }
}
