-- Chạy đúng 1 lần file này trong Supabase SQL Editor (tab mới, trống)
-- Phục vụ: (1) giải thích đáp án, (2) quản lý câu hỏi ngay trên web

-- 1. Thêm cột giải thích đáp án (không bắt buộc, để trống nếu chưa có)
alter table questions add column if not exists explanation text;

-- 2. Cho phép trang quản lý câu hỏi trên web có thể thêm / sửa / xoá câu hỏi.
--    (Trang đó đã được bảo vệ bằng mật khẩu admin ở tầng ứng dụng rồi,
--    đoạn này chỉ mở quyền tương ứng ở tầng database.)
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'questions' and policyname = 'Cho phep ghi cau hoi'
  ) then
    create policy "Cho phep ghi cau hoi" on questions for insert with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'questions' and policyname = 'Cho phep sua cau hoi'
  ) then
    create policy "Cho phep sua cau hoi" on questions for update using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'questions' and policyname = 'Cho phep xoa cau hoi'
  ) then
    create policy "Cho phep xoa cau hoi" on questions for delete using (true);
  end if;
end $$;
