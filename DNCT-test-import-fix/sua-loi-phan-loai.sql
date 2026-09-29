-- ============================================================
-- SỬA LỖI 1: 14 câu hỏi về máy phát điện (turbo, nạp khí, bôi trơn,
-- làm mát, nhiên liệu...) đang bị gắn nhầm category "UPS" ngay từ file
-- Excel gốc -> chuyển đúng về "Máy phát"
-- ============================================================
update questions set category = 'Máy phát'
where category in ('UPS', 'Hệ UPS')
  and (
    question_text ilike '%máy phát điện đang sử dụng tại nhà ga%'
    or question_text ilike '%số vòng quay định mức%'
    or question_text ilike '%máy phát điện bao gồm những hệ thống%'
    or question_text ilike '%nạp khí và xả khí%'
    or question_text ilike '%turbocharger%'
    or question_text ilike '%bôi trơn%'
    or question_text ilike '%hệ thống làm mát%'
    or question_text ilike '%hệ thống nhiên liệu%'
  );

-- ============================================================
-- SỬA LỖI 2: gộp CHẮC CHẮN mọi biến thể tên có chứa chữ "XLNT" về
-- chung 1 tên "Nước thải" — dùng cách tìm "chứa chữ XLNT" thay vì so
-- khớp chính xác từng tên cũ, để không bị sót do lệch dấu/khoảng trắng
-- ============================================================
update questions set category = 'Nước thải'
where category ilike '%XLNT%';

-- Phòng trường hợp trước đó bạn chưa chạy các câu update khác, chạy
-- gộp lại các phần liên quan nước thải một lần nữa cho chắc:
update questions set category = 'Nước thải'
where category in (
  'Hệ bơm tuần hoàn bùn',
  'Hệ bơm tuần hoàn nước',
  'Hệ bơm bể đầu vào',
  'Hệ bơm hoá chất 1-5',
  'Hệ bơm điều hoà',
  'Hệ thoát nước mái nhà ga và mương thoát nước',
  'Hoá chất - Pin - mẫu thử',
  'Chất lượng nước thải đầu ra và nước uống RO'
);

-- Câu khử khuẩn RO và các câu về tiêu chuẩn nước uống vẫn tách riêng qua RO
update questions set category = 'RO'
where question_text ilike '%khử khuẩn RO%'
   or question_text ilike '%nước uống%'
   or question_text ilike '%nước khoáng%'
   or question_text ilike '%chỉ số TDS%'
   or question_text ilike '%Clo dư%';

-- ============================================================
-- Kiểm tra lại: xem còn category nào KHÔNG thuộc 9 hệ đã liệt kê không
-- (chạy dòng SELECT này riêng để xem kết quả, không phải lệnh sửa)
-- ============================================================
-- select category, count(*) from questions group by category order by category;
