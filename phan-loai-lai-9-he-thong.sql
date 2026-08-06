-- ============================================================
-- Gom lại toàn bộ chủ đề (category) về đúng các hệ thống đang quản lý:
-- UPS, Hạ thế, Trung thế, Máy phát, Nước cấp, Nước thải, RO, 5S, Thiết bị vệ sinh
-- ============================================================

-- UPS
update questions set category = 'UPS'
where category in ('UPS', 'Hệ UPS');

-- Hạ thế
update questions set category = 'Hạ thế'
where category in ('Hệ thống hạ thế LC', 'Hệ thống điện hạ thế LT, MBA');

-- Trung thế
update questions set category = 'Trung thế'
where category = 'Hệ thống trung thế';

-- Máy phát
update questions set category = 'Máy phát'
where category = 'Bơm dầu máy phát';

-- Nước cấp: trạm bơm nước cấp + phần "đài phun nước / bể tam giác" (không tính phần Liftpit)
update questions set category = 'Nước cấp'
where category = 'Trạm bơm nước cấp';

update questions set category = 'Nước cấp'
where category = 'Hệ bơm tiểu cảnh và bơm Liftpit'
  and question_text not ilike '%lipit%'
  and question_text not ilike '%lifpit%';

-- Nước thải: toàn bộ các hệ liên quan xử lý nước thải (XLNT), bơm hoá chất XLNT,
-- bơm điều hoà XLNT, bơm tuần hoàn, bể đầu vào, thoát nước mái, và phần Liftpit
-- (hố ga/hố bơm thoát nước, khác với đài phun nước ở trên)
update questions set category = 'Nước thải'
where category in (
  'Hệ thống XLNT',
  'Hệ thống thiết bị XLNT',
  'Hệ bơm không sử dụng biến tần của hệ thống XLNT',
  'Hệ thống bơm có sử dụng biến tần của hệ thống XLNT',
  'Hệ bơm tuần hoàn bùn',
  'Hệ bơm tuần hoàn nước',
  'Hệ bơm bể đầu vào',
  'Hệ bơm hoá chất 1-5',
  'Hệ bơm điều hoà',
  'Hệ thoát nước mái nhà ga và mương thoát nước'
);

update questions set category = 'Nước thải'
where category = 'Hệ bơm tiểu cảnh và bơm Liftpit'
  and (question_text ilike '%lipit%' or question_text ilike '%lifpit%');

-- "Hoá chất - Pin - mẫu thử": phần lớn là hoá chất châm cho XLNT -> Nước thải,
-- riêng câu về khử khuẩn RO -> chuyển qua RO ở bước dưới
update questions set category = 'Nước thải'
where category = 'Hoá chất - Pin - mẫu thử';

-- RO: cụm máy nước RO + câu khử khuẩn RO (đang nằm lẫn trong nhóm hoá chất) +
-- các câu về tiêu chuẩn nước uống (đang nằm lẫn trong nhóm chất lượng nước thải)
update questions set category = 'RO'
where category = 'Hệ thống các cây nước RO';

update questions set category = 'RO'
where question_text ilike '%khử khuẩn RO%';

update questions set category = 'RO'
where category = 'Chất lượng nước thải đầu ra và nước uống RO'
  and (
    question_text ilike '%nước uống%'
    or question_text ilike '%nước khoáng%'
    or question_text ilike '%TDS%'
    or question_text ilike '%Clo dư%'
  );

-- Phần còn lại của nhóm "chất lượng nước thải..." (nói về QCVN nước thải) -> Nước thải
update questions set category = 'Nước thải'
where category = 'Chất lượng nước thải đầu ra và nước uống RO';

-- 5S và Thiết bị vệ sinh: đã đúng tên sẵn, không cần đổi.

-- Các chủ đề sau KHÔNG thuộc 9 hệ trên (an toàn điện quầy thuê, chiếu sáng,
-- chống sét...) nên mình giữ nguyên tên cũ, không gộp — xem ghi chú cuối file
-- hướng dẫn nếu bạn muốn xử lý thêm.
