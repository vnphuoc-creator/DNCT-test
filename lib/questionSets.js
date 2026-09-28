import { supabase } from "./supabaseClient";
import { pickEvenlyAcrossCategories } from "./quizPicker";

export const QUESTION_SETS_COUNT = 10;
export const QUESTIONS_PER_SET = 25;

// Lấy danh sách các bộ đề đã tạo sẵn (không kèm nội dung chi tiết từng câu, chỉ số lượng).
export async function listQuestionSets() {
  const { data, error } = await supabase
    .from("question_sets")
    .select("id, name, question_ids, created_at")
    .order("id", { ascending: true });
  if (error) throw error;
  return (data || []).map((s) => ({
    ...s,
    count: Array.isArray(s.question_ids) ? s.question_ids.length : 0,
  }));
}

// Lấy đầy đủ nội dung câu hỏi của 1 bộ đề (dùng để admin xem trước, hoặc để gửi cho người làm bài).
export async function getQuestionSetWithQuestions(setId) {
  const { data: setRow, error: setError } = await supabase
    .from("question_sets")
    .select("id, name, question_ids, created_at")
    .eq("id", setId)
    .single();
  if (setError) throw setError;

  const ids = setRow.question_ids || [];
  if (ids.length === 0) return { ...setRow, questions: [] };

  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("*")
    .in("id", ids);
  if (qError) throw qError;

  // Giữ đúng thứ tự đã bốc khi tạo bộ đề
  const byId = {};
  for (const q of questions || []) byId[q.id] = q;
  const ordered = ids.map((id) => byId[id]).filter(Boolean);

  return { ...setRow, questions: ordered };
}

// Tạo (hoặc tạo lại) N bộ đề, mỗi bộ gồm `perSet` câu chia đều cho từng hệ thống (category).
// Thao tác này thay thế các bộ đề tự tạo cũ (không đụng tới bộ đề import từ file) — không ảnh hưởng tới kho câu hỏi gốc.
export async function regenerateQuestionSets(count = QUESTION_SETS_COUNT, perSet = QUESTIONS_PER_SET) {
  const { data: allQuestions, error: fetchError } = await supabase.from("questions").select("id, category");
  if (fetchError) throw fetchError;
  if (!allQuestions || allQuestions.length === 0) {
    throw new Error("Chưa có câu hỏi nào trong Ngân hàng câu hỏi để tạo bộ đề.");
  }

  // Chỉ xoá các bộ đề tự tạo ("Bộ đề 1".."Bộ đề N"); bộ đề admin đã import từ file được giữ nguyên.
  const { data: existing, error: listError } = await supabase.from("question_sets").select("id, name");
  if (listError) throw listError;
  const autoIds = (existing || []).filter((s) => /^Bộ đề \d+$/.test(s.name)).map((s) => s.id);
  if (autoIds.length > 0) {
    const { error: deleteError } = await supabase.from("question_sets").delete().in("id", autoIds);
    if (deleteError) throw deleteError;
  }

  const rows = [];
  for (let i = 1; i <= count; i++) {
    const picked = pickEvenlyAcrossCategories(allQuestions, perSet);
    rows.push({
      name: `Bộ đề ${i}`,
      question_ids: picked.map((q) => q.id),
    });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("question_sets")
    .insert(rows)
    .select("id, name, question_ids, created_at");
  if (insertError) throw insertError;

  return listQuestionSets();
}
