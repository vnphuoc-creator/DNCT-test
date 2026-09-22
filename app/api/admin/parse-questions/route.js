import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Compatibility endpoint for deployments that still call /api/admin/parse-questions.
// The main admin question importer can parse files client-side, but keeping this
// endpoint prevents older deployments from failing when they call this route.
export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Thiếu file PDF/Word." }, { status: 400 });
    }

    const name = String(file.name || "").toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || "";
    } else if (name.endsWith(".pdf")) {
      // Use pdf-parse here for compatibility with the older API contract.
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = pdfParseModule.default || pdfParseModule;
      const result = await pdfParse(buffer);
      text = result.text || "";
    } else {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ PDF và Word .docx." },
        { status: 400 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Không thể đọc file." },
      { status: 500 }
    );
  }
}
