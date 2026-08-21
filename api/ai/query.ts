import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query, materialsSummary, transactionsSummary } = req.body || {};

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query is required" });
  }

  const ai = getGemini();

  if (!ai) {
    return res.json({
      intent: "general_search",
      textResponse: `Kết quả tìm kiếm cho truy vấn: "${query}". Hệ thống đang sử dụng bộ lọc tìm kiếm thông minh cục bộ.`,
      suggestedFilters: {
        searchKeyword: query,
      },
    });
  }

  try {
    const prompt = `Bạn là trợ lý ảo AI chuyên gia quản lý kho vật tư công nghiệp và xây dựng (hệ thống quản lý vật tư mã bắt đầu bằng DN_).
Người dùng hỏi: "${query}"

Dữ liệu tóm tắt kho hiện tại:
${materialsSummary || "Không có tóm tắt chi tiết"}

Dữ liệu tóm tắt giao dịch gần đây:
${transactionsSummary || "Không có giao dịch"}

Nhiệm vụ:
1. Phân tích ý định của người dùng (tìm vật tư, kiểm tra tồn kho, cảnh báo sắp hết hàng, lọc theo mã DN_, lọc phiếu, hoặc hỏi đáp thống kê).
2. Trả về phản hồi hữu ích, chuyên nghiệp bằng tiếng Việt.
3. Cung cấp bộ lọc JSON gợi ý để giao diện tự động lọc bảng dữ liệu.

Hãy trả về phản hồi định dạng JSON strictly with this schema:
{
  "intent": "search_material" | "low_stock_alert" | "view_transactions" | "stock_valuation" | "general_qa",
  "textResponse": "câu trả lời chi tiết, ngắn gọn, súc tích và có ích bằng tiếng Việt",
  "suggestedFilters": {
    "searchKeyword": "từ khóa lọc nếu có hoặc rỗng",
    "category": "tên nhóm nếu có hoặc rỗng",
    "stockStatus": "ALL" | "LOW_STOCK" | "OUT_OF_STOCK" | "OVER_STOCK" | "OPTIMAL",
    "materialCodePrefix": "DN_",
    "transactionStatus": "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  },
  "highlightedMaterialCodes": ["mã vật tư DN_ liên quan nếu có"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction:
          "Bạn là trợ lý AI quản lý kho vật tư thông minh. Luôn phản hồi bằng tiếng Việt chuẩn xác, tôn trọng quy tắc mã vật tư DN_.",
      },
    });

    const outputText = response.text || "{}";
    try {
      const parsed = JSON.parse(outputText);
      return res.status(200).json(parsed);
    } catch {
      return res.status(200).json({
        intent: "general_qa",
        textResponse: outputText,
        suggestedFilters: { searchKeyword: query },
      });
    }
  } catch (err: unknown) {
    console.error("Gemini API error:", err);
    return res.status(500).json({
      error: "Lỗi xử lý AI, sử dụng tìm kiếm tiêu chuẩn",
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
