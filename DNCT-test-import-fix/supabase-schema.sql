-- Chạy toàn bộ file này trong Supabase: SQL Editor -> New query -> Run

-- Bảng chứa câu hỏi
create table if not exists questions (
  id bigint generated always as identity primary key,
  question_text text not null,
  options jsonb not null,        -- ví dụ: ["Hà Nội", "Huế", "TP.HCM", "Đà Nẵng"]
  correct_index int not null,    -- vị trí đáp án đúng trong mảng options, bắt đầu từ 0
  category text,                 -- chủ đề/hệ thống của câu hỏi, dùng để lọc báo cáo
  explanation text,              -- giải thích vì sao đáp án đó đúng (không bắt buộc)
  created_at timestamptz default now()
);

-- Bảng lưu kết quả từng lượt làm bài
create table if not exists quiz_results (
  id bigint generated always as identity primary key,
  user_name text not null,
  score int not null,
  total int not null,
  answers jsonb,                 -- chi tiết từng câu: [{question_id, question_text, selected_index, correct_index, is_correct}, ...]
  duration_seconds int,          -- thời gian làm bài, tính bằng giây
  period text,                   -- tháng làm bài, dạng "YYYY-MM", ví dụ "2026-08"
  created_at timestamptz default now()
);

-- Nếu bảng quiz_results đã tồn tại từ trước (chưa có các cột này), thêm vào:
alter table quiz_results add column if not exists duration_seconds int;
alter table quiz_results add column if not exists period text;
alter table quiz_results add column if not exists email text;

-- Gán "tháng" cho các lượt làm bài cũ đã có sẵn (dựa theo thời điểm nộp bài),
-- để không bị mất dấu khi tra cứu theo tháng.
update quiz_results set period = to_char(created_at, 'YYYY-MM') where period is null;

-- Bật Row Level Security (bắt buộc với Supabase)
alter table questions enable row level security;
alter table quiz_results enable row level security;

-- Cho phép ai cũng ĐỌC được câu hỏi (cần thiết để web hiển thị đề)
create policy "Cho phép đọc câu hỏi" on questions
  for select using (true);

-- Cho phép trang quản lý câu hỏi (đã bảo vệ bằng mật khẩu ở tầng ứng dụng) ghi/sửa/xoá câu hỏi
create policy "Cho phép ghi câu hỏi" on questions
  for insert with check (true);

create policy "Cho phép sửa câu hỏi" on questions
  for update using (true) with check (true);

create policy "Cho phép xoá câu hỏi" on questions
  for delete using (true);

-- Cho phép ai cũng GHI kết quả (nộp bài)
create policy "Cho phép ghi kết quả" on quiz_results
  for insert with check (true);

-- Cho phép ai cũng ĐỌC kết quả (xem lịch sử)
create policy "Cho phép đọc kết quả" on quiz_results
  for select using (true);

-- Vài câu hỏi mẫu để bạn test thử, xoá đi và thêm câu của riêng bạn sau
insert into questions (question_text, options, correct_index) values
('Thủ đô của Việt Nam là gì?', '["Hà Nội", "Huế", "TP.HCM", "Đà Nẵng"]', 0),
('2 + 2 x 2 bằng bao nhiêu?', '["8", "6", "4", "10"]', 1),
('HTML là viết tắt của?', '["HyperText Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlink Text Marking Language"]', 0),
('Ngôn ngữ nào dùng để tạo kiểu dáng cho web?', '["CSS", "JSON", "SQL", "HTTP"]', 0),
('Việt Nam giáp bao nhiêu quốc gia trên đất liền?', '["1", "2", "3", "4"]', 2);
