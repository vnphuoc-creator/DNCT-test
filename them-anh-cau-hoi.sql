-- Thêm cột lưu đường dẫn ảnh cho mỗi câu hỏi
alter table questions add column if not exists image_url text;

-- Tạo "kho chứa" (bucket) để lưu file ảnh câu hỏi, cho phép truy cập công khai
-- (để ảnh hiển thị được khi mọi người làm bài, không cần đăng nhập)
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;

-- Cho phép ai cũng XEM được ảnh (bắt buộc, để hiện ảnh khi làm bài)
create policy "Cho phep xem anh cau hoi"
on storage.objects for select
using (bucket_id = 'question-images');

-- Cho phép tải ảnh lên (dùng ở trang Quản lý câu hỏi)
create policy "Cho phep tai anh cau hoi len"
on storage.objects for insert
with check (bucket_id = 'question-images');

-- Cho phép xoá ảnh cũ khi thay ảnh khác hoặc xoá câu hỏi
create policy "Cho phep xoa anh cau hoi"
on storage.objects for delete
using (bucket_id = 'question-images');
