import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Route này được Vercel Cron tự động gọi 1 lần/ngày (xem vercel.json), chỉ để tạo
// 1 truy vấn nhẹ tới Supabase — mục đích duy nhất là giữ cho project Supabase
// KHÔNG bị tự động tạm dừng do 7 ngày liên tục không có hoạt động (áp dụng cho
// gói miễn phí). Không đọc/ghi dữ liệu thật, không ảnh hưởng gì tới ứng dụng.
export async function GET(request) {
  // Xác thực: chỉ cho phép chính Vercel Cron gọi route này (Vercel tự động đính
  // kèm header Authorization: Bearer <CRON_SECRET>, biến CRON_SECRET được Vercel
  // tự tạo sẵn khi bạn cấu hình cron trong vercel.json — không cần tự thêm gì).
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Truy vấn nhẹ nhất có thể: chỉ đếm, không tải dữ liệu thật
    const { error } = await supabase.from("questions").select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ ok: false, message: String(err) }, { status: 500 });
  }
}
