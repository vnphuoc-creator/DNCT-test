-- Gộp "UPS" và "Hệ UPS" thành 1 tên duy nhất
update questions set category = 'Hệ UPS' where category = 'UPS';

-- Gộp 3 chủ đề liên quan tới XLNT thành 1 mục chung "Hệ thống XLNT"
update questions
set category = 'Hệ thống XLNT'
where category in (
  'Hệ thống thiết bị XLNT',
  'Hệ bơm không sử dụng biến tần của hệ thống XLNT',
  'Hệ thống bơm có sử dụng biến tần của hệ thống XLNT'
);
