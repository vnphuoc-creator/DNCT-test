-- ============================================================
-- Script sửa lỗi chính tả, chuẩn hóa câu hỏi & câu trả lời
-- Chạy script này trên Supabase SQL Editor để cập nhật ngay lập tức
-- các câu hỏi hiện có trong cơ sở dữ liệu.
-- ============================================================

-- 1. Sửa lỗi chính tả trong bảng questions (question_text & options)
UPDATE questions 
SET question_text = REPLACE(question_text, 'rỉ rét , lủng mái', 'rỉ sét, thủng mái')
WHERE question_text LIKE '%rỉ rét%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'sân đổ', 'sân đỗ')
WHERE question_text LIKE '%sân đổ%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'xẩy ra', 'xảy ra')
WHERE question_text LIKE '%xẩy ra%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'xen kẻ', 'xen kẽ')
WHERE question_text LIKE '%xen kẻ%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'bao nhiều WC( tính lun khu Cip)', 'bao nhiêu WC (tính luôn khu CIP)?')
WHERE question_text LIKE '%bao nhiều WC%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'rỷ nước', 'rỉ nước')
WHERE question_text LIKE '%rỷ nước%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'Nước rỷ chân tường nvs do đâu', 'Nước rỉ chân tường nhà vệ sinh do đâu?')
WHERE question_text LIKE '%Nước rỷ chân tường%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'áp xuất cao', 'áp suất cao')
WHERE question_text LIKE '%áp xuất cao%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'màn lọc MBR', 'màng lọc MBR')
WHERE question_text LIKE '%màn lọc MBR%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'cài đặc', 'cài đặt')
WHERE question_text LIKE '%cài đặc%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'bơm tuần bùn', 'bơm tuần hoàn bùn')
WHERE question_text LIKE '%bơm tuần bùn%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'Bơm bể đầu vào gồm mấy con', 'Bơm bể đầu vào gồm mấy máy bơm?')
WHERE question_text LIKE '%Bơm bể đầu vào gồm mấy con%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'sử đụng điện', 'sử dụng điện')
WHERE question_text LIKE '%sử đụng điện%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'trình bầy', 'trình bày')
WHERE question_text LIKE '%trình bầy%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'Gae 8910', 'Gate 8, 9, 10')
WHERE question_text LIKE '%Gae 8910%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'Công suất bơm bể điều bao nhiêu?', 'Công suất bơm bể điều hòa là bao nhiêu?')
WHERE question_text LIKE '%Công suất bơm bể điều bao nhiêu%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'Công suất bơm hút màn bao nhiêu?', 'Công suất bơm hút màng là bao nhiêu?')
WHERE question_text LIKE '%Công suất bơm hút màn%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'xử dụng', 'sử dụng')
WHERE question_text LIKE '%xử dụng%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'suất hiện mã lỗi', 'xuất hiện mã lỗi')
WHERE question_text LIKE '%suất hiện mã lỗi%';

UPDATE questions 
SET question_text = REPLACE(question_text, 'interlook', 'interlock')
WHERE question_text LIKE '%interlook%';

-- 2. Chuẩn hóa trong các lựa chọn đáp án (options - JSONB / TEXT)
UPDATE questions 
SET options = REPLACE(options::text, 'đeo đây đai', 'đeo dây đai')::jsonb
WHERE options::text LIKE '%đeo đây đai%';

UPDATE questions 
SET options = REPLACE(options::text, 'Hottline PKT', 'Hotline PKT')::jsonb
WHERE options::text LIKE '%Hottline PKT%';

UPDATE questions 
SET options = REPLACE(options::text, 'Roăn su', 'Gioăng cao su')::jsonb
WHERE options::text LIKE '%Roăn su%';

UPDATE questions 
SET options = REPLACE(options::text, 'Roang kết nối', 'Gioăng kết nối')::jsonb
WHERE options::text LIKE '%Roang kết nối%';

UPDATE questions 
SET options = REPLACE(options::text, 'board điều khiểu', 'board điều khiển')::jsonb
WHERE options::text LIKE '%board điều khiểu%';

UPDATE questions 
SET options = REPLACE(options::text, 'khối Rectier', 'khối Rectifier')::jsonb
WHERE options::text LIKE '%khối Rectier%';

UPDATE questions 
SET options = REPLACE(options::text, 'Xilicon', 'Silicon')::jsonb
WHERE options::text LIKE '%Xilicon%';

UPDATE questions 
SET options = REPLACE(options::text, 'aair khí', 'e khí (air khí)')::jsonb
WHERE options::text LIKE '%aair khí%';

UPDATE questions 
SET options = REPLACE(options::text, 'Chậu rữa bếp', 'Chậu rửa bếp')::jsonb
WHERE options::text LIKE '%Chậu rữa bếp%';

UPDATE questions 
SET options = REPLACE(options::text, 'bể màn MBR', 'bể màng MBR')::jsonb
WHERE options::text LIKE '%bể màn MBR%';

UPDATE questions 
SET options = REPLACE(options::text, 'Hoạt động luôn phiên', 'Hoạt động luân phiên')::jsonb
WHERE options::text LIKE '%Hoạt động luôn phiên%';

UPDATE questions 
SET options = REPLACE(options::text, 'Chay luân phiên', 'Chạy luân phiên')::jsonb
WHERE options::text LIKE '%Chay luân phiên%';

UPDATE questions 
SET options = REPLACE(options::text, 'Rowle nhiệt', 'Rơ le nhiệt')::jsonb
WHERE options::text LIKE '%Rowle nhiệt%';

UPDATE questions 
SET options = REPLACE(options::text, 'rơlay nhiệt', 'rơ le nhiệt')::jsonb
WHERE options::text LIKE '%rơlay nhiệt%';

UPDATE questions 
SET options = REPLACE(options::text, '5kư', '5.5kW')::jsonb
WHERE options::text LIKE '%5kư%';

UPDATE questions 
SET options = REPLACE(options::text, 'Kiêmr tra', 'Kiểm tra')::jsonb
WHERE options::text LIKE '%Kiêmr tra%';

UPDATE questions 
SET options = REPLACE(options::text, 'Kiêm tra', 'Kiểm tra')::jsonb
WHERE options::text LIKE '%Kiêm tra%';

UPDATE questions 
SET options = REPLACE(options::text, 'swtich Off', 'switch Off')::jsonb
WHERE options::text LIKE '%swtich Off%';

UPDATE questions 
SET options = REPLACE(options::text, 'Khả năngngắt mạch', 'Khả năng ngắt mạch')::jsonb
WHERE options::text LIKE '%Khả năngngắt mạch%';

UPDATE questions 
SET options = REPLACE(options::text, 'ngắn mach', 'ngắn mạch')::jsonb
WHERE options::text LIKE '%ngắn mach%';

UPDATE questions 
SET options = REPLACE(options::text, 'chìa khóa interlook', 'chìa khóa interlock')::jsonb
WHERE options::text LIKE '%chìa khóa interlook%';
