-- ============================================================
-- DNCT TEST - NÂNG CẤP LỊCH GIỜ / BỘ ĐỀ / XÓA KẾT QUẢ / IMPORT
-- Chạy file này SAU supabase-schema.sql và tao-bang-cai-dat.sql
-- ============================================================

-- 1) Cho phép admin reset/xóa kết quả qua giao diện quản trị hiện tại.
-- Lưu ý: app hiện dùng Supabase anon client + cookie admin ở tầng web.
-- Policy này giữ tương thích với kiến trúc hiện hữu.
drop policy if exists "Cho phep xoa ket qua" on quiz_results;
create policy "Cho phep xoa ket qua" on quiz_results
  for delete using (true);

-- 2) Lưu 10 bộ đề cố định
create table if not exists quiz_sets (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  is_active boolean default false,
  created_at timestamptz default now()
);

create table if not exists quiz_set_questions (
  set_id bigint not null references quiz_sets(id) on delete cascade,
  question_id bigint not null references questions(id) on delete cascade,
  position int not null,
  primary key (set_id, question_id),
  unique (set_id, position)
);

alter table quiz_sets enable row level security;
alter table quiz_set_questions enable row level security;

drop policy if exists "Cho phep doc bo de" on quiz_sets;
create policy "Cho phep doc bo de" on quiz_sets
  for select using (true);

drop policy if exists "Cho phep tao bo de" on quiz_sets;
create policy "Cho phep tao bo de" on quiz_sets
  for insert with check (true);

drop policy if exists "Cho phep sua bo de" on quiz_sets;
create policy "Cho phep sua bo de" on quiz_sets
  for update using (true) with check (true);

drop policy if exists "Cho phep xoa bo de" on quiz_sets;
create policy "Cho phep xoa bo de" on quiz_sets
  for delete using (true);

drop policy if exists "Cho phep doc cau trong bo de" on quiz_set_questions;
create policy "Cho phep doc cau trong bo de" on quiz_set_questions
  for select using (true);

drop policy if exists "Cho phep tao cau trong bo de" on quiz_set_questions;
create policy "Cho phep tao cau trong bo de" on quiz_set_questions
  for insert with check (true);

drop policy if exists "Cho phep xoa cau trong bo de" on quiz_set_questions;
create policy "Cho phep xoa cau trong bo de" on quiz_set_questions
  for delete using (true);

-- 3) Cấu hình chế độ thi và bộ đề đang gửi cho tất cả người tham gia
insert into app_settings (key, value) values
  ('quiz_mode', 'random'),
  ('quiz_active_set_id', '')
on conflict (key) do nothing;

-- 4) Cấu hình giờ mở/đóng mặc định
insert into app_settings (key, value) values
  ('quiz_open_time', '08:00'),
  ('quiz_close_time', '17:00')
on conflict (key) do nothing;

-- 5) Cột bộ đề để lưu dấu vết: người này đã làm bộ đề nào
alter table quiz_results add column if not exists quiz_set_id bigint;
alter table quiz_results add column if not exists quiz_set_name text;
