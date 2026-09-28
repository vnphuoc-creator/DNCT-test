-- Chạy TOÀN BỘ file này trong Supabase: SQL Editor -> New query -> Run
-- (an toàn để chạy nhiều lần — mọi lệnh đều có kiểm tra "if not exists" / "if exists")
--
-- File này bổ sung cho các yêu cầu:
--   1) Khung giờ mở bài test mỗi ngày (ngoài lịch ngày mở/đóng đã có)
--   2) (không cần SQL — chỉ đổi code trang đăng nhập)
--   3) Bộ đề câu hỏi cố định (10 bộ, mỗi bộ 25 câu chia đều theo hệ)
--   4) SỬA LỖI: xoá kết quả theo kỳ / theo 1 nhân viên không xoá được do THIẾU CHÍNH SÁCH XOÁ
--      (RLS) trên bảng quiz_results — đây là nguyên nhân khiến nút "Xoá" trước đây báo thành
--      công nhưng thực chất không xoá được dòng nào.
--   5) (không cần SQL — bảng questions dùng lại, chỉ đổi code trang Ngân hàng câu hỏi)

-- =====================================================================================
-- 4) SỬA LỖI: thêm chính sách cho phép XOÁ kết quả (trước đây chỉ có select + insert)
-- =====================================================================================
drop policy if exists "Cho phep xoa ket qua" on quiz_results;
create policy "Cho phep xoa ket qua" on quiz_results
  for delete using (true);

-- =====================================================================================
-- 1) Khung giờ mở bài test mỗi ngày — mặc định 00:00–23:59 (mở cả ngày, giữ nguyên hành vi cũ)
-- =====================================================================================
insert into app_settings (key, value) values
  ('quiz_open_time', '00:00'),
  ('quiz_close_time', '23:59')
on conflict (key) do nothing;

-- =====================================================================================
-- 3) Bảng lưu các "bộ đề" câu hỏi cố định (mỗi bộ là 1 danh sách id câu hỏi)
-- =====================================================================================
create table if not exists question_sets (
  id bigint generated always as identity primary key,
  name text not null,
  question_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table question_sets enable row level security;

drop policy if exists "Cho phep doc bo de" on question_sets;
create policy "Cho phep doc bo de" on question_sets
  for select using (true);

drop policy if exists "Cho phep them bo de" on question_sets;
create policy "Cho phep them bo de" on question_sets
  for insert with check (true);

drop policy if exists "Cho phep sua bo de" on question_sets;
create policy "Cho phep sua bo de" on question_sets
  for update using (true) with check (true);

drop policy if exists "Cho phep xoa bo de" on question_sets;
create policy "Cho phep xoa bo de" on question_sets
  for delete using (true);

-- Cấu hình chế độ ra đề: 'random' (mặc định, random riêng từng người) hoặc 'fixed_set'
-- (dùng 1 bộ đề cố định cho tất cả, chọn qua trang Cài đặt hệ thống)
insert into app_settings (key, value) values
  ('quiz_mode', 'random'),
  ('quiz_active_set_id', '')
on conflict (key) do nothing;
