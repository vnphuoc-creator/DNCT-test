-- Sửa 14 câu hỏi máy phát điện bị gán nhầm category 'UPS' ngay từ file gốc
update questions set category = 'Máy phát'
where category = 'UPS' and question_text in (
  'Model của máy phát điện đang sử dụng tại nhà ga là gì',
  'Công suất, tần số và số vòng quay định mức của máy phát điện trong nhà ga là bao nhiêu',
  'Máy phát điện bao gồm những hệ thống chính nào',
  'Chức năng của hệ thống nạp khí và xả khí trong máy phát điện',
  'Các thành phần chính trong hệ thống nạp khí và xả khí',
  'Hệ thống turbocharger có chức năng gì',
  'Chức năng của hệ thống bôi trơn trong máy phát',
  'Hệ thống bôi trơn được áp dụng cho các bộ phận nào trong động cơ',
  'Các thành phần chính trong hệ thống bôi trơn',
  'Chức năng của hệ thống làm mát là gì',
  'Hệ thống làm mát cho các bộ phận nào trong máy phát',
  'Các thành phần chính trong hệ thống làm mát',
  'Chức năng của hệ thống nhiên liệu là gì',
  'Các thành phần chính trong hệ thống nhiên liệu'
);

-- Gộp triệt để mọi biến thể tên còn dính chữ XLNT về 1 mục 'Nước thải'
-- (phòng trường hợp file gộp trước chưa chạy hết, hoặc còn sót tên biến thể)
update questions set category = 'Nước thải' where category ilike '%XLNT%';