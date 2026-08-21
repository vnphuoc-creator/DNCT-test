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

  const { lowStockItems, totalMaterials, totalValue } = req.body || {};
  const ai = getGemini();

  if (!ai) {
    return res.status(200).json({
      summary: `Hiện tại có ${lowStockItems?.length || 0} vật tư dưới ngưỡng an toàn cần bổ sung.`,
      recommendations: [
        "Lập phiếu đề xuất nhập kho cho các vật tư có mức tồn dưới tối thiểu",
        "Kiểm tra lại định mức an toàn định kỳ mỗi tháng",
      ],
    });
  }

  try {
    const prompt = `Phân tích tình trạng kho vật tư:
- Tổng số loại vật tư: ${totalMaterials}
- Tổng giá trị tồn: ${totalValue} VNĐ
- Danh sách vật tư dưới định mức tối thiểu: ${JSON.stringify(lowStockItems)}

Hãy đưa ra:
1. Đánh giá rủi ro thiếu hụt vật tư.
2. Đề xuất kế hoạch nhập kho ưu tiên (số lượng gợi ý đặt hàng).
3. Lời khuyên tối ưu hóa dòng tiền và an toàn kho.

Trả về JSON dạng:
{
  "riskLevel": "THẤP" | "TRUNG BÌNH" | "CAO",
  "summary": "đánh giá tổng quan ngắn",
  "priorityOrders": [
    {
      "code": "mã DN_",
      "name": "tên vật tư",
      "suggestedQuantity": 0,
      "reason": "lý do"
    }
  ],
  "recommendations": ["khuyến nghị 1", "khuyến nghị 2"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.status(200).json(parsed);
  } catch (err: unknown) {
    console.error("AI Analysis error:", err);
    return res.status(500).json({
      error: "Không thể phân tích dữ liệu kho",
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
