-- Dọn khoảng trắng thừa ở đầu/cuối tên chủ đề (nếu có), để khớp chính xác
-- với danh sách cố định trong trang Quản lý câu hỏi.
update questions set category = trim(category) where category is not null;

-- Kiểm tra lại: liệt kê toàn bộ tên chủ đề đang có trong database, để đối
-- chiếu với danh sách cố định trong file lib/categories.js
select category, count(*) as so_cau
from questions
group by category
order by category;
