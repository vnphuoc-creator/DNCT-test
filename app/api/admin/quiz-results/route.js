import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  // Ưu tiên service role key nếu có để bypass RLS khi xóa
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder";
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period");
    const email = searchParams.get("email");

    const supabase = getSupabaseClient();
    let query = supabase.from("quiz_results").select("*").order("created_at", { ascending: false });

    if (period && period !== "all") {
      query = query.eq("period", period);
    }
    if (email) {
      query = query.ilike("email", email);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ results: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const body = await req.json();
    const { id, email, period, deleteAllPeriod } = body;

    const supabase = getSupabaseClient();

    // 1. Xóa toàn bộ kết quả của 1 kỳ
    if (deleteAllPeriod && period) {
      const { data, error } = await supabase
        .from("quiz_results")
        .delete()
        .eq("period", period)
        .select("id");

      if (error) {
        console.error("Lỗi xóa kết quả theo kỳ:", error);
        return NextResponse.json({ error: "Lỗi Supabase: " + error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Đã xóa toàn bộ kết quả bài thi của kỳ ${period}. Tất cả nhân sự trong kỳ này có thể làm lại bài thi.`,
        deletedCount: data ? data.length : 0,
      });
    }

    // 2. Xóa theo ID kết quả cụ thể
    if (id) {
      const { data, error } = await supabase
        .from("quiz_results")
        .delete()
        .eq("id", id)
        .select("id, user_name, email, period");

      if (error) {
        console.error("Lỗi xóa kết quả theo ID:", error);
        return NextResponse.json({ error: "Lỗi Supabase: " + error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Đã xóa bài thi thành công. Nhân sự có thể vào làm lại bài thi mới ngay lập tức.`,
        deleted: data,
      });
    }

    // 3. Xóa theo Email và Kỳ (Period)
    if (email && period) {
      const { data, error } = await supabase
        .from("quiz_results")
        .delete()
        .ilike("email", email.trim())
        .eq("period", period)
        .select("id, user_name");

      if (error) {
        console.error("Lỗi xóa kết quả theo Email + Kỳ:", error);
        return NextResponse.json({ error: "Lỗi Supabase: " + error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Đã xóa bài thi của nhân sự (${email}) trong kỳ ${period}. Nhân sự có thể vào làm lại ngay.`,
        deleted: data,
      });
    }

    return NextResponse.json(
      { error: "Yêu cầu không hợp lệ. Cần cung cấp id, hoặc period + deleteAllPeriod, hoặc email + period." },
      { status: 400 }
    );
  } catch (err) {
    console.error("Lỗi trong DELETE /api/admin/quiz-results:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
