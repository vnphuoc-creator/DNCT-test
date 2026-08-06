-- Bảng danh sách người được phép làm bài (tên + email cá nhân)
create table if not exists allowed_users (
  id bigint generated always as identity primary key,
  full_name text not null,
  email text not null unique,
  created_at timestamptz default now()
);

alter table allowed_users enable row level security;

create policy "Cho phep doc danh sach nguoi dung" on allowed_users
  for select using (true);

create policy "Cho phep ghi danh sach nguoi dung" on allowed_users
  for insert with check (true);

create policy "Cho phep sua danh sach nguoi dung" on allowed_users
  for update using (true);

create policy "Cho phep xoa danh sach nguoi dung" on allowed_users
  for delete using (true);

-- Thêm 24 người từ file danh sách tên bạn đã gửi
insert into allowed_users (full_name, email) values
('Nguyễn Văn Đức', 'duc.nguyen@ahtcorp.vn'),
('Nguyễn Đức Linh Rin', 'rin.nguyen@ahtcorp.vn'),
('Nguyễn Hữu Hạnh', 'hanh.nguyen@ahtcorp.vn'),
('Lê Nhật Trình', 'trinh.le@ahtcorp.vn'),
('Phạm Hà', 'hapham281@gmail.com'),
('Nguyễn Mạnh Dũng', 'manhdung051184@gmail.com'),
('Đào Phú Nhân', 'gialacdao@gmail.com'),
('Lê Văn Quang', 'vanquang15994@gmail.com'),
('Vy Ngọc Phước', 'vn.phuoc235@gmail.com'),
('Lê Đức Chiến', 'ldchienlilama18@gmail.com'),
('Nguyễn Duy Kích', 'duykich1985@gmail.com'),
('Lê Kim Trọng', 'lekimtrong0810@gmail.com'),
('Đỗ Hữu Thi', 'dohuuthi96@gmail.com'),
('Nguyễn Thị Vi Na', 'nguyenthivina010602@gmail.com'),
('Nguyễn Xuân Sen', 'nguyenxuansen3004@gmail.com'),
('Phạm Tuấn Nam', 'namluffy@gmail.com'),
('Phan Quốc Tiến', 'tienphanquoc2809@gmail.com'),
('Nguyễn Đại Huynh', 'nguyendaihuynh.cdl@gmail.com'),
('Nguyễn Quốc Vương', 'theking2485@gmail.com'),
('Phạm Thành Công', 'thanhcong8207@gmail.com'),
('Huỳnh Ngọc Thông', 'ngthongdng@gmail.com'),
('Hoàng Văn Toàn', 'hoang.toan2409@gmail.com'),
('Nguyễn Văn Tuấn', 'tuan.nv145@gmail.com'),
('Nguyễn Mạnh Hùng', 'hungnguyen020710@gmail.com');