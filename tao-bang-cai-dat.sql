-- Bảng lưu các cài đặt hệ thống có thể chỉnh trực tiếp từ trang Cài đặt (admin),
-- không cần sửa biến môi trường / deploy lại mỗi lần đổi.
create table if not exists app_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

alter table app_settings enable row level security;

create policy "Cho phep doc cai dat" on app_settings
  for select using (true);

create policy "Cho phep them cai dat" on app_settings
  for insert with check (true);

create policy "Cho phep sua cai dat" on app_settings
  for update using (true);

-- Giá trị mặc định ban đầu — khớp với quy định hiện tại (mở từ ngày 27 đến 30)
insert into app_settings (key, value) values
  ('quiz_override_open', 'false'),
  ('quiz_open_day', '27'),
  ('quiz_close_day', '30')
on conflict (key) do nothing;
