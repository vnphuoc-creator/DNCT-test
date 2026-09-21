import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DEFAULT_SETTINGS } from "../../../lib/settings";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "system_settings.json");

function readSettingsFromFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error("Lỗi đọc system_settings.json:", err);
  }
  return { ...DEFAULT_SETTINGS };
}

function writeSettingsToFile(settings) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("Lỗi ghi system_settings.json:", err);
  }
}

export async function GET() {
  const settings = readSettingsFromFile();
  return NextResponse.json(settings);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const current = readSettingsFromFile();
    const updated = {
      ...current,
      ...body,
      // Đảm bảo kiểu số hợp lệ
      quizDurationMinutes: Number(body.quizDurationMinutes) || current.quizDurationMinutes,
      questionsCount: Number(body.questionsCount) || current.questionsCount,
      passScorePercent: Number(body.passScorePercent) || current.passScorePercent,
      excellentScorePercent: Number(body.excellentScorePercent) || current.excellentScorePercent,
      monthlyOpenDay: Number(body.monthlyOpenDay) || current.monthlyOpenDay,
      monthlyCloseDay: Number(body.monthlyCloseDay) || current.monthlyCloseDay,
    };

    writeSettingsToFile(updated);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
