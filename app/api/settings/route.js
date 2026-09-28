import { NextResponse } from "next/server";
import { getSettings, updateSetting, DEFAULT_SETTINGS } from "../../../lib/settings";

export const runtime = "nodejs";

function isAuthed(request) {
  return request.cookies.get("admin_auth")?.value === "1";
}

export async function GET() {
  const stored = await getSettings();
  return NextResponse.json({ ok: true, settings: { ...DEFAULT_SETTINGS, ...stored } });
}

export async function POST(request) {
  if (!isAuthed(request)) {
    return NextResponse.json({ ok: false, message: "Chưa đăng nhập admin." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const entries = body?.settings && typeof body.settings === "object" ? body.settings : body;
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
      return NextResponse.json({ ok: false, message: "Dữ liệu cài đặt không hợp lệ." }, { status: 400 });
    }

    const allowed = new Set(Object.keys(DEFAULT_SETTINGS));
    for (const [key, value] of Object.entries(entries)) {
      if (!allowed.has(key)) continue;
      const { error } = await updateSetting(key, value);
      if (error) throw error;
    }

    const stored = await getSettings();
    return NextResponse.json({ ok: true, settings: { ...DEFAULT_SETTINGS, ...stored } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error?.message || "Không thể lưu cài đặt." },
      { status: 500 }
    );
  }
}
