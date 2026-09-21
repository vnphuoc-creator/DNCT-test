import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DEFAULT_EXAM_SETS } from "../../../lib/examSets";

const DATA_DIR = path.join(process.cwd(), "data");
const SETS_FILE = path.join(DATA_DIR, "exam_sets.json");

function readSetsFromFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SETS_FILE)) {
      const content = fs.readFileSync(SETS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Lỗi đọc exam_sets.json:", err);
  }
  return DEFAULT_EXAM_SETS;
}

function writeSetsToFile(sets) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SETS_FILE, JSON.stringify(sets, null, 2), "utf-8");
  } catch (err) {
    console.error("Lỗi ghi exam_sets.json:", err);
  }
}

export async function GET() {
  const sets = readSetsFromFile();
  return NextResponse.json({ sets });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const currentSets = readSetsFromFile();

    // 1. Tạo bộ đề mới
    if (body.action === "create") {
      const newIndex = currentSets.length + 1;
      const newCode = `ĐỀ-${String(newIndex).padStart(2, "0")}`;
      const newSet = {
        id: `set-${String(newIndex).padStart(2, "0")}`,
        code: newCode,
        name: body.name || `Bộ đề số ${newIndex}: ${body.title || "Tùy chọn"}`,
        description: body.description || "Bộ đề thi tùy chỉnh do Quản trị viên khởi tạo.",
        questionCount: Number(body.questionCount) || 25,
        focusCategories: Array.isArray(body.focusCategories) ? body.focusCategories : [],
        question_ids: Array.isArray(body.question_ids) ? body.question_ids : [],
        created_at: new Date().toISOString(),
        isDefault: false,
      };
      const updated = [...currentSets, newSet];
      writeSetsToFile(updated);
      return NextResponse.json({ success: true, set: newSet, sets: updated });
    }

    // 2. Lưu toàn bộ danh sách bộ đề
    if (Array.isArray(body.sets)) {
      writeSetsToFile(body.sets);
      return NextResponse.json({ success: true, sets: body.sets });
    }

    return NextResponse.json({ error: "Thao tác không hợp lệ" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
