import { NextResponse } from "next/server";

// Mật khẩu được so khớp ở phía SERVER, không lộ ra trình duyệt người dùng.
// Đặt biến môi trường ADMIN_PASSWORD trong Vercel (KHÔNG thêm tiền tố NEXT_PUBLIC_).
export async function POST(request) {
  const { password } = await request.json();
  const correctPassword = process.env.ADMIN_PASSWORD;

  if (!correctPassword) {
    return NextResponse.json(
      { ok: false, message: "Chưa cấu hình ADMIN_PASSWORD trên server." },
      { status: 500 }
    );
  }

  if (password !== correctPassword) {
    return NextResponse.json(
      { ok: false, message: "Sai mật khẩu." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_auth", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 ngày
  });
  return response;
}
