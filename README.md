# Bài Test Kiến Thức — Hướng dẫn cho người mới

Đây là một web bài test kiến thức hoàn chỉnh:
- Câu hỏi được trộn ngẫu nhiên
- Tự chấm điểm
- Lưu lịch sử kết quả từng người vào Supabase (một database miễn phí)
- Deploy miễn phí lên Vercel

Bạn không cần biết code trước. Làm theo đúng thứ tự bên dưới.

---

## Bước 1 — Tạo tài khoản (5 phút)

Bạn cần 3 tài khoản, đều miễn phí:

1. **GitHub** — nơi lưu code: https://github.com/signup
2. **Supabase** — database chứa câu hỏi và kết quả: https://supabase.com (bấm "Start your project", đăng nhập bằng GitHub cho nhanh)
3. **Vercel** — nơi web của bạn chạy thật: https://vercel.com (cũng đăng nhập bằng GitHub)

---

## Bước 2 — Tạo database trên Supabase (10 phút)

1. Vào https://supabase.com/dashboard → **New project**
2. Đặt tên project (ví dụ `quiz-app`), đặt mật khẩu database (nhớ lưu lại), chọn khu vực gần bạn (Singapore là gần Việt Nam nhất)
3. Chờ khoảng 1-2 phút để Supabase khởi tạo xong
4. Vào mục **SQL Editor** (biểu tượng ở thanh bên trái) → **New query**
5. Mở file `supabase-schema.sql` (đi kèm trong thư mục này), copy toàn bộ nội dung, dán vào ô query
6. Bấm **Run**

File này sẽ tự động:
- Tạo bảng `questions` (chứa câu hỏi)
- Tạo bảng `quiz_results` (chứa điểm số từng người)
- Bật quyền truy cập để web đọc/ghi được
- Thêm sẵn 5 câu hỏi mẫu để bạn test thử

7. Vào mục **Table Editor** để xem — bạn sẽ thấy 5 câu hỏi mẫu đã có sẵn trong bảng `questions`

**Muốn thêm câu hỏi của riêng bạn?** Vào `Table Editor` → chọn bảng `questions` → **Insert row**, điền:
- `question_text`: nội dung câu hỏi
- `options`: mảng các đáp án, dạng `["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"]`
- `correct_index`: vị trí đáp án đúng, đếm từ **0**. Ví dụ đáp án đúng là "Đáp án B" (vị trí thứ 2) thì điền `1`.

8. Lấy khóa kết nối: vào **Project Settings** (biểu tượng bánh răng) → **API**. Bạn cần 2 giá trị:
   - **Project URL**
   - **anon public key**

   Giữ tab này mở, bạn sẽ cần dán 2 giá trị này ở Bước 4.

---

## Bước 3 — Đưa code lên GitHub (5 phút)

1. Vào https://github.com/new
2. Đặt tên repository, ví dụ `quiz-app`, để **Public** hoặc **Private** đều được → **Create repository**
3. GitHub sẽ hiện hướng dẫn "…or push an existing repository from the command line". Nếu bạn chưa quen dùng terminal, cách dễ nhất là:
   - Bấm **uploading an existing file** trên trang repository vừa tạo
   - Kéo thả toàn bộ các file và thư mục trong project này vào (trừ các file/thư mục không cần: không có `node_modules` hay `.next` vì đã dọn sẵn)
   - Bấm **Commit changes**

---

## Bước 4 — Deploy lên Vercel (5 phút)

1. Vào https://vercel.com/new
2. Chọn **Import** repository `quiz-app` bạn vừa tạo ở GitHub
3. Ở phần **Environment Variables**, thêm đúng 2 biến (lấy từ Bước 2.8):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL từ Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key từ Supabase |

4. Bấm **Deploy**
5. Chờ khoảng 1-2 phút, Vercel sẽ cho bạn một đường link dạng `quiz-app-xxxx.vercel.app` — đó là web thật, ai cũng truy cập được

---

## Bước 5 — Thử nghiệm

1. Mở link Vercel vừa nhận được
2. Nhập tên → **Bắt đầu làm bài**
3. Trả lời hết câu hỏi → xem điểm
4. Bấm **Xem lịch sử** để thấy tên và điểm vừa lưu

Nếu thấy lỗi đỏ trên màn hình, thường là do:
- Sai `NEXT_PUBLIC_SUPABASE_URL` hoặc `NEXT_PUBLIC_SUPABASE_ANON_KEY` trong Vercel → vào **Project → Settings → Environment Variables** để sửa lại rồi **Redeploy**
- Chưa chạy file `supabase-schema.sql` → quay lại Bước 2

---

## Cấu trúc project (để bạn tham khảo khi muốn sửa)

```
quiz-app/
├── app/
│   ├── page.js           trang chủ, nhập tên
│   ├── quiz/page.js      trang làm bài, chấm điểm
│   ├── results/page.js   trang xem lịch sử điểm
│   ├── layout.js         khung chung của toàn web
│   └── globals.css       toàn bộ giao diện/màu sắc
├── lib/
│   └── supabaseClient.js kết nối tới Supabase
├── supabase-schema.sql   chạy 1 lần trong Supabase để tạo bảng
└── .env.local.example    mẫu file biến môi trường
```

## Muốn sửa gì thì sửa ở đâu?

- **Đổi câu hỏi**: sửa trực tiếp trong bảng `questions` trên Supabase (Table Editor), không cần đụng vào code
- **Đổi màu sắc / giao diện**: sửa file `app/globals.css`
- **Đổi chữ trên trang chủ**: sửa file `app/page.js`
- Mỗi lần sửa code và đẩy (push) lên GitHub, Vercel sẽ **tự động deploy lại** — không cần làm gì thêm

## Cập nhật mới: Ôn tập + Giải thích đáp án + Quản lý câu hỏi qua web

### Bắt buộc: chạy 1 file SQL trước

1. Vào Supabase → **SQL Editor** → **New query** (tab trống, mới)
2. Copy toàn bộ nội dung file **`migration-on-tap-quan-ly.sql`** → dán → **Run**

File này thêm cột "giải thích đáp án" và mở quyền cho trang quản lý câu hỏi có thể thêm/sửa/xoá.

### 1. Chế độ Ôn tập (`/practice`, link "Ôn tập trước khi thi" ở trang chủ)

- **Ai cũng dùng được**, không cần mật khẩu, làm bao nhiêu lần tuỳ thích
- Chọn chủ đề (hoặc "Tất cả") và số câu muốn ôn (10 / 25 / 50 / tất cả)
- Chọn đáp án là thấy đúng/sai + giải thích ngay (nếu câu đó có giải thích)
- **Không lưu vào báo cáo**, không tính vào giới hạn "1 lần/tháng" của bài kiểm tra chính thức

### 2. Giải thích đáp án

Thêm giải thích cho từng câu hỏi qua trang **Quản lý câu hỏi** (xem mục 3). Giải thích sẽ tự
hiện ra ngay dưới đáp án — cả trong bài kiểm tra chính thức lẫn khi ôn tập — ngay sau khi người
làm bài chọn 1 đáp án. Câu nào chưa có giải thích thì cứ để trống, không bắt buộc.

### 3. Quản lý câu hỏi qua web (`/admin-questions`, link "Quản lý câu hỏi" ở trang chủ)

Từ giờ **không cần vào Supabase gõ SQL nữa** để sửa ngân hàng câu hỏi:

- Xem danh sách toàn bộ câu hỏi, tìm theo nội dung hoặc chủ đề
- **Thêm câu hỏi mới**: nhập nội dung, các đáp án (tối thiểu 2, tối đa 6), bấm chọn đáp án đúng,
  thêm chủ đề và giải thích nếu muốn
- **Sửa** câu hỏi có sẵn — bấm "Sửa" ở dòng tương ứng
- **Xoá** câu hỏi — có hỏi xác nhận trước khi xoá, xoá xong không khôi phục lại được

Trang này cũng cần mật khẩu admin giống trang Báo cáo/Dashboard (dùng chung `ADMIN_PASSWORD` đã
có, không cần cấu hình thêm).

**Lưu ý bảo mật nhỏ**: quyền ghi/sửa/xoá câu hỏi ở tầng database hiện đang mở cho bất kỳ ai gọi
đúng API của Supabase (không chỉ riêng trang web này), tương tự cách quyền đọc câu hỏi đã hoạt
động từ đầu. Trang trên web được khoá bằng mật khẩu, nhưng đây không phải bảo mật ở mức "không
thể phá được" — phù hợp cho một công cụ đào tạo nội bộ, không phù hợp nếu dữ liệu cực kỳ nhạy
cảm. Nói mình biết nếu bạn cần nâng cấp lên mức bảo mật chặt chẽ hơn.

## Cập nhật mới: giao diện mới + danh sách người dùng đăng ký sẵn

### 1. Giao diện thiết kế lại

Đổi hẳn phong cách hình ảnh — từ "nền đen viền xanh lá" chung chung sang **bảng điều khiển kỹ
thuật** (màu hổ phách/amber như đèn báo thiết bị công nghiệp, chữ số kiểu đồng hồ đo, lưới kỹ
thuật mờ ở nền), phù hợp hơn với nội dung đào tạo kỹ thuật vận hành (trạm bơm, UPS, hạ thế...).
Điểm nhấn là **đồng hồ đo điểm số dạng vòng tròn** ở màn hình kết quả, thay cho con số đơn giản
trước đây. Không cần cấu hình gì thêm, đã tự áp dụng cho toàn bộ các trang.

### 2. Đăng nhập bằng cách chọn từ danh sách đã đăng ký

Trang chủ giờ không cho gõ tên/email tự do nữa — người làm bài **gõ để tìm và chọn đúng tên
mình** trong danh sách đã đăng ký sẵn (giống ô tìm kiếm autocomplete). Việc này chặt chẽ hơn hẳn
so với gõ tự do: không ai gõ sai tên/email của mình được, và không ai làm bài được nếu chưa có
tên trong danh sách.

**Quản lý danh sách này ở đâu?** Vào link **"Quản lý người dùng"** ở trang chủ (cần mật khẩu
admin) — thêm/sửa/xoá người ngay trên web, không cần SQL. Đã import sẵn 24 người từ file
`danh_sách_tên.xlsx` bạn gửi.

### Bắt buộc: chạy SQL để tạo danh sách người dùng

1. Vào Supabase → **SQL Editor** → **New query** (tab trống mới)
2. Dán và chạy toàn bộ nội dung file **`import-danh-sach-nguoi-dung.sql`** — tạo bảng
   `allowed_users` và import sẵn 24 người

## Đã xong: xoá lịch sử tháng 8 + tính "kỳ" theo chu kỳ từ ngày 25 (không theo lịch tháng)

### 1. Xoá lịch sử các bài đã làm trong tháng 8

Vào Supabase → SQL Editor → New query → chạy:

```sql
delete from quiz_results where period = '2026-08';
```

**Cảnh báo**: xoá vĩnh viễn, không khôi phục lại được.

### 2. Tính "kỳ làm bài" theo chu kỳ 25 → 24 tháng sau, không theo lịch tháng thường

**Vấn đề trước đây**: hệ thống tính "đã làm bài tháng này chưa" theo đúng lịch tháng (ngày 1 tới
cuối tháng). Nếu ai đó lỡ vào làm bài **trước** ngày mở chính thức (ví dụ ngày 20/8, trước mốc mở
27/8), lượt đó vẫn bị tính vào "tháng 8" — khiến khi tới ngày mở thật (27/8), người đó bị báo
"đã làm rồi", dù họ làm bài không đúng lúc.

**Cách sửa**: đổi cách tính kỳ sang **chu kỳ xoay vòng bắt đầu đúng ngày mở bài test** (dùng
chung biến `NEXT_PUBLIC_QUIZ_OPEN_DAY` đã có sẵn — không cần thêm biến mới). Ví dụ đặt ngày mở là
`25`:

- Từ 25/8 đến hết 24/9 → tính chung 1 kỳ, nhãn hiển thị "2026-08"
- Ai làm bài trước ngày 25/9 (kể cả lỡ vào sớm) → vẫn thuộc kỳ trước đó, không bị chặn khi kỳ mới
  (từ 25/9) thật sự bắt đầu

**Bạn cần làm 1 việc**: vào Vercel → Settings → Environment Variables → sửa `NEXT_PUBLIC_QUIZ_OPEN_DAY`
thành `25` (trước đó có thể đang là `27` từ lần cấu hình trước) → **Redeploy**.

Trang Báo cáo và Dashboard cũng tự động nhóm dữ liệu theo đúng chu kỳ mới này, không cần chỉnh gì
thêm.

## Đã xong: logo khi chia sẻ link + tìm kiếm dài hơn + dashboard mượt hơn

### 1. Logo công ty khi chia sẻ link

Tạo riêng 1 ảnh xem trước đẹp (1200x630 — đúng kích thước chuẩn Zalo/Messenger/Facebook hay
dùng), kết hợp nền trời + máy bay + logo AHT + tên "Bài Test Kiến Thức", thay vì chỉ để trống như
trước.

**Bắt buộc phải làm thêm 1 bước** để ảnh hiện đúng khi dán link (nếu bỏ qua, một số ứng dụng có
thể không hiện được ảnh preview):

1. Vào Vercel → project → **Settings** → **Environment Variables**
2. Thêm biến:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | Đúng domain thật bạn đang dùng, ví dụ `https://dnct-test.vercel.app` |

3. **Redeploy**

Nếu domain thay đổi sau này (như đã đổi vài lần trước đây), nhớ quay lại sửa biến này cho khớp.

### 2. Thanh tìm kiếm trong Quản lý người dùng

Đã đổi giống hệt cách làm ở Quản lý câu hỏi — nằm riêng 1 dòng, dài hết chiều ngang trang.

### 3. Dashboard mượt hơn

Thêm hiệu ứng chuyển động mượt cho tất cả biểu đồ (cột, đường, tròn đều có hiệu ứng "vẽ dần" khi
tải trang thay vì hiện đột ngột), thêm hiệu ứng mờ dần khi đổi bộ lọc tháng, và hiệu ứng nhẹ khi
rê chuột qua các ô số liệu tổng quan.

### Về việc xuất ra Google Sheet

File Excel (`.xlsx`) đang xuất ra từ nút "Xuất báo cáo ra Excel" đã **mở được trực tiếp trong
Google Sheets** — vào Google Sheets → **File → Import** (hoặc **Nhập**) → tải file `.xlsx` vừa
tải về lên → chọn "Insert new sheet(s)" → xong, không cần bước chuyển đổi nào thêm.

Nếu ý bạn là muốn web **tự động ghi thẳng vào 1 Google Sheet đang mở sẵn** (không cần tải file
rồi tự tay import) — đây là tính năng lớn hơn, cần đúng bước cấu hình phức tạp (Google Cloud,
Service Account...) mà lúc trước bạn đã chọn dùng dashboard trong web để tránh việc này. Nếu vẫn
muốn làm hướng đó, nói mình biết, mình sẽ hướng dẫn từng bước.

## Đã xong: nền bầu trời + máy bay ảnh thật, kích thước lớn

Đổi hẳn nền toàn trang từ màu tối kiểu bảng điều khiển sang **nền bầu trời** (gradient xanh dương,
có vài đám mây mờ trang trí), dùng đúng ảnh máy bay bạn gửi — phóng lên độ phân giải cao (600x600,
ảnh gốc là icon phẳng nên phóng to vẫn nét, không bị vỡ) và tăng kích thước hiển thị (320px trên
máy tính, 190px trên điện thoại — trước đó chỉ là hình vẽ nhỏ ~220px mờ nhạt).

Các thẻ nội dung (card) vẫn giữ màu tối như trước — nổi bật rõ trên nền trời sáng, tạo cảm giác
như bảng điều khiển/màn hình buồng lái đang nổi giữa bầu trời, hợp với hình ảnh máy bay bay qua.

**Không cần cấu hình hay chạy SQL gì thêm** — chỉ cần upload code mới lên GitHub là áp dụng ngay.

## Đã xong: ẩn mô tả khi chia sẻ link + chủ đề cố định + máy bay dễ thấy hơn

### 1. Ẩn mô tả kỹ thuật khi chia sẻ link

Trước đây khi dán link vào Zalo/Messenger, phần xem trước hiện dòng "Web bài test kiến thức tự
chấm điểm, dựng bằng Next.js + Supabase" — đã bỏ dòng này, giờ chia sẻ link chỉ hiện tên
"Bài Test Kiến Thức", không lộ thông tin công nghệ nữa.

### 2. Chủ đề cố định trong Quản lý câu hỏi

Trước đây ô "Chủ đề" là gõ tự do — dễ bị lệch tên theo thời gian (gõ "Nước cấp" khác lần "Trạm
bơm nước cấp" chẳng hạn). Giờ đổi thành **danh sách chọn sẵn cố định** (15 hệ thống, dựa theo
đúng sheet "Phân hệ" trong file bạn gửi trước đó) — thêm câu hỏi mới chỉ việc chọn đúng hệ trong
danh sách, không gõ tay nữa, không còn sinh thêm chủ đề trùng/lệch tên.

Vẫn có lựa chọn "+ Chủ đề khác (gõ tay)..." ở cuối danh sách, dùng khi thật sự cần thêm 1 hệ
thống hoàn toàn mới chưa có trong danh sách.

**Muốn sửa/thêm/bớt hệ thống trong danh sách cố định này?** Chỉ cần sửa 1 file duy nhất:
`lib/categories.js` — thêm/xoá/đổi tên dòng nào trong mảng đó là áp dụng luôn cho toàn bộ trang
Quản lý câu hỏi, không cần đụng gì khác. Nói mình biết nếu muốn mình chỉnh giúp.

**Chạy thêm 1 dòng SQL để dọn sạch dữ liệu cũ** (phòng còn sót khoảng trắng thừa trong tên chủ đề
từ trước, khiến không khớp chính xác với danh sách cố định): chạy file **`chuan-hoa-chu-de.sql`**
trong Supabase — dòng lệnh cuối trong file sẽ liệt kê lại toàn bộ tên chủ đề hiện có, bạn xem thử
có tên nào lạ/không khớp danh sách cố định thì báo mình để sửa tiếp.

### 3. Máy bay dễ nhận thấy hơn

Rút ngắn thời gian bay 1 vòng (từ 34s xuống 22s) và cho máy bay xuất hiện gần như ngay khi tải
trang (trước đây phải chờ khoảng 6 giây mới thấy vì điểm xuất phát ở xa ngoài màn hình). Nếu upload
code này lên mà vẫn không thấy máy bay, khả năng cao là bước upload GitHub/deploy Vercel chưa
hoàn tất — kiểm tra lại tab Deployments trên Vercel xem trạng thái đã "Ready" với đúng commit mới
nhất chưa.

## Đã xong: rút gọn ô tên, thanh tìm kiếm dài hơn, máy bay bay động nền web

### 1. Ô chọn tên trên trang chủ

Sau khi chọn xong, ô chỉ hiện **tên** (không hiện kèm email nữa) — gọn hơn khi nhìn. Lúc đang gõ
tìm kiếm, danh sách gợi ý bên dưới vẫn hiện đủ cả tên và email để bạn dễ phân biệt người trùng tên
(nếu có).

### 2. Thanh tìm kiếm trong Quản lý câu hỏi

Đã kéo dài ra hết chiều ngang trang (trước đây bị chia sẻ chỗ với nút "+ Thêm câu hỏi" nên hơi
ngắn), giờ nằm riêng 1 dòng, dễ gõ và đọc kết quả hơn.

### 3. Máy bay bay ngang nền web

Thêm 1 hình máy bay dạng vẽ đơn giản (véc-tơ, không phải ảnh/video thật — công cụ hiện tại chưa
làm được ảnh động thật), bay chậm rãi theo đường chéo qua nền web, có gắn logo công ty lên thân
kiểu logo hãng bay. Hiệu ứng nhẹ nhàng, mờ, không làm rối mắt khi đọc nội dung. Nếu trình duyệt
của người dùng bật chế độ "giảm hiệu ứng chuyển động" (dành cho người dễ chóng mặt), máy bay sẽ tự
ẩn đi, không di chuyển.

**Muốn chỉnh gì thêm** (đổi tốc độ bay, đổi hướng bay, làm to/nhỏ máy bay, đổi màu...) cứ nói
mình biết, sửa nhanh.

## Đã xong: khoá lịch mở bài test hằng tháng + bộ câu hỏi mới + logo công ty

### 1. Chỉ mở bài test từ ngày 27 hằng tháng tới hết tháng

Trước đây phải tự tay đổi 2 mốc ngày cố định mỗi tháng — giờ chỉ cần đặt **đúng 1 lần**, hệ thống
tự lặp lại hằng tháng, không cần chỉnh lại nữa:

1. Vào Vercel → project → **Settings** → **Environment Variables**
2. Thêm biến mới:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_QUIZ_OPEN_DAY` | `27` |

3. **Nếu trước đó bạn đã từng thêm `NEXT_PUBLIC_QUIZ_START` hoặc `NEXT_PUBLIC_QUIZ_DEADLINE`, xoá
   2 biến đó đi** — 2 biến cũ là mốc cố định 1 lần, nếu còn tồn tại sẽ được ưu tiên hơn và làm
   biến `NEXT_PUBLIC_QUIZ_OPEN_DAY` mới không có tác dụng
4. **Redeploy** để áp dụng

Từ ngày 27 mỗi tháng, ai vào web cũng làm bài được, đến hết ngày cuối tháng thì tự khoá lại, sang
ngày 27 tháng sau lại tự mở — không cần bạn thao tác gì thêm.

### 2. Thay hoàn toàn bộ câu hỏi cũ bằng bộ câu hỏi mới (giữ nguyên 5S)

Đọc file **`Bộ_câu_hỏi_DNCT.xlsx`** bạn gửi, trích được **313 câu hỏi** (đúng theo tên các hệ
thống bạn đã tự chuẩn hoá sẵn trong sheet "Phân hệ" của file — không cần mình đoán/gộp category
nữa vì bạn đã làm sẵn). Có 1 dòng bị bỏ qua do thiếu đáp án D trong file gốc, giống lỗi gặp lần
trước ("Quy định đưa máy cắt vào vị trí vận hành").

**Cách chạy**: Supabase → SQL Editor → New query → dán toàn bộ nội dung file
**`import-bo-cau-hoi-dnct-moi.sql`** → Run. File này **tự động xoá mọi câu hỏi cũ, CHỈ giữ lại
đúng các câu thuộc chủ đề "5S"**, rồi thêm 313 câu mới vào — chạy 1 lần là đủ, không cần chạy các
file phân loại/gộp chủ đề trước đó nữa (bộ câu hỏi mới đã có category đúng sẵn).

### 3. Logo công ty trên mọi trang

Logo giờ hiện cố định ở góc trên bên trái mọi trang (dạng thẻ nhãn sáng nổi bật trên nền tối,
giống nhãn tên thiết bị công nghiệp), bấm vào logo sẽ về lại trang chủ. Không cần cấu hình gì
thêm, ảnh đã đóng gói sẵn trong code (`public/logo.png`).

## Đã xong: sửa phân loại còn sót + menu trang chủ gọn gàng hơn

### 1. Sửa 14 câu máy phát bị gán nhầm "UPS", gộp triệt để XLNT

Rà lại kỹ hơn, phát hiện **toàn bộ 14 câu hỏi về máy phát điện** (turbo, nạp/xả khí, bôi trơn, làm
mát, nhiên liệu) bị gán nhầm chủ đề `"UPS"` **ngay từ file Excel gốc** — không phải lỗi ở bước
gộp trước, mà là dữ liệu gốc đã sai. Đồng thời gộp triệt để mọi biến thể tên còn dính chữ "XLNT"
về chung 1 mục "Nước thải", phòng trường hợp bước gộp trước chưa chạy hết.

**Cách chạy**: Supabase → SQL Editor → New query → dán toàn bộ nội dung file
**`sua-loi-phan-loai-bo-sung.sql`** → Run. File này an toàn để chạy bất kể bạn đã chạy các file
gộp chủ đề trước đó hay chưa.

### 2. Menu trang chủ gọn gàng hơn, có icon

Đổi từ các dòng chữ link liệt kê thành **lưới ô vuông có icon**, tách rõ 2 khu vực: **"Luyện
tập"** (ai cũng dùng được — Ôn tập) và **"Khu vực quản trị"** (cần mật khẩu — Lịch sử, Báo cáo,
Dashboard, Quản lý câu hỏi, Quản lý người dùng), giúp người làm bài không bị rối bởi các link quản
trị không dành cho họ.

## Đã xong: thêm ảnh minh hoạ cho câu hỏi + xác nhận thanh tìm kiếm

### 1. Thanh tìm kiếm trong Quản lý câu hỏi

Đã có sẵn từ bản trước (ô "Tìm theo nội dung hoặc chủ đề..." ngay trên danh sách) — tìm theo cả
nội dung câu hỏi lẫn tên chủ đề cùng lúc. Nếu bạn chưa thấy, có thể đang dùng bản code cũ hơn,
upload lại bản zip mới nhất này là có.

### 2. Thêm ảnh minh hoạ cho câu hỏi

Giờ có thể gắn ảnh cho từng câu hỏi — ảnh sẽ hiện ra ngay phía trên nội dung câu hỏi khi làm bài
(cả bài thi chính thức lẫn ôn tập).

**Bắt buộc: chạy SQL trước** để tạo "kho chứa ảnh" trên Supabase:

1. Vào Supabase → **SQL Editor** → **New query** (tab trống mới)
2. Dán và chạy toàn bộ nội dung file **`them-anh-cau-hoi.sql`**

**Cách thêm ảnh cho 1 câu hỏi**: vào trang **Quản lý câu hỏi** → Sửa (hoặc Thêm câu hỏi mới) →
mục "Hình ảnh minh hoạ" → bấm chọn file ảnh từ máy (jpg/png/webp, tối đa 5MB) → ảnh tự động tải
lên và hiện xem trước ngay → bấm **Lưu câu hỏi** là xong. Muốn đổi ảnh khác thì bấm "Xoá ảnh" rồi
chọn file mới.

**Lưu ý về bảo mật**: giống với việc mở quyền ghi cho bảng câu hỏi trước đây, kho ảnh này cũng
cho phép tải lên công khai qua khoá `anon key` — về lý thuyết ai có kỹ thuật vẫn có thể tải ảnh
lạ lên kho này mà không qua trang đăng nhập. Rủi ro thấp với 1 công cụ nội bộ, nhưng nói mình biết
nếu bạn muốn nâng cấp bảo mật chặt hơn sau này.

## Đã xong: gom lại đúng 9 hệ thống + bốc câu hỏi chia đều

### 1. Gom chủ đề về đúng 9 hệ đang quản lý

File **`phan-loai-lai-9-he-thong.sql`** (chạy file này, **không cần chạy** file
`gop-chu-de-trung-lap.sql` cũ nữa vì file mới đã bao gồm cả phần đó) sẽ gom toàn bộ câu hỏi về
đúng 9 hệ: **UPS, Hạ thế, Trung thế, Máy phát, Nước cấp, Nước thải, RO, 5S, Thiết bị vệ sinh**.

Mình đọc kỹ nội dung từng câu hỏi (không chỉ theo tên nhóm cũ) để phân loại chính xác, có vài chỗ
đáng chú ý:
- Nhóm "Hoá chất - Pin - mẫu thử" thực chất toàn câu về hoá chất châm cho nước thải → đưa hết vào
  **Nước thải**, riêng câu "khử khuẩn RO" tách ra **RO**
- Nhóm "Chất lượng nước thải đầu ra và nước uống RO" bị trộn 2 chủ đề trong 1 tên — mình tách theo
  đúng nội dung: câu nào nói về nước thải (QCVN 14) → **Nước thải**, câu nào nói về nước uống/TDS/
  Clo dư → **RO**
- Nhóm "bơm tiểu cảnh và bơm Liftpit" cũng bị trộn: câu về đài phun nước/bể tam giác → **Nước
  cấp**, câu về hố Lipit/Lifpit (trạm bơm thoát nước) → **Nước thải**

**Một số chủ đề không thuộc 9 hệ trên** (an toàn điện quầy thuê, chiếu sáng, chống sét...) — mình
giữ nguyên tên cũ, chưa gộp vào đâu cả, vì bạn có nói còn quản lý thêm hệ khác ngoài 9 hệ đã liệt
kê. Nếu muốn xử lý tiếp các chủ đề này, nói mình biết.

**Cách chạy**: Supabase → SQL Editor → New query → dán toàn bộ nội dung file
`phan-loai-lai-9-he-thong.sql` → Run.

### 2. Bốc 25 câu hỏi chia đều theo từng hệ

Trước đây bốc hoàn toàn ngẫu nhiên trong cả kho 357+ câu — hệ nào có nhiều câu (ví dụ UPS có 40
câu) sẽ dễ chiếm phần lớn bài test, hệ ít câu (ví dụ Máy phát chỉ 8 câu) dễ bị bỏ sót. Giờ đã đổi
sang cách bốc **chia đều theo từng hệ trước**, sau đó mới trộn ngẫu nhiên trong từng hệ — với 9
hệ và 25 câu, mỗi hệ sẽ ra khoảng 2-3 câu mỗi lượt, không hệ nào bị lấn át. Không cần cấu hình gì
thêm, đã tự áp dụng ngay khi bạn upload code mới.

## Đã xong: bộ câu hỏi "BÀI TEST KIỂM TRA 5S" + gộp chủ đề trùng lặp

### 1. Import 22 câu hỏi 5S

Đọc lại kỹ file Word, phát hiện đáp án đúng được đánh dấu bằng **màu chữ đỏ** (không phải tô đậm
như lần kiểm tra đầu) — nhờ vậy trích được đủ đáp án cho toàn bộ câu hỏi, không cần đoán:

1. Vào Supabase → **SQL Editor** → **New query** (tab trống mới)
2. Dán và chạy toàn bộ nội dung file **`import-cau-hoi-5s.sql`**

22 câu này được gắn `category = '5S'`, nên sẽ tự xuất hiện thành 1 mục riêng trong bộ lọc chủ đề
ở trang **Ôn tập**, không lẫn với các chủ đề kỹ thuật khác.

*(Lưu ý: đếm được 22 câu chứ không phải 20 như ước tính ban đầu — có 3 câu trong file gốc có tới
5 lựa chọn A-E thay vì 4, tất cả đều là câu hỏi thật, không trùng lặp.)*

### 2. Gộp các chủ đề trùng lặp/liên quan

1. Tab mới khác → dán và chạy toàn bộ nội dung file **`gop-chu-de-trung-lap.sql`**

File này gộp:
- `"UPS"` và `"Hệ UPS"` → còn lại 1 tên `"Hệ UPS"`
- 3 chủ đề liên quan tới XLNT (`Hệ thống thiết bị XLNT`, `Hệ bơm không sử dụng biến tần...`, `Hệ
  thống bơm có sử dụng biến tần...`) → gộp chung thành `"Hệ thống XLNT"`

## Cập nhật mới: Ôn tập + Giải thích đáp án + Quản lý câu hỏi trên web + Email làm định danh

### Bắt buộc: chạy SQL trước

1. Vào Supabase → **SQL Editor** → **New query** (tab trống mới)
2. Dán và chạy toàn bộ nội dung file **`migration-on-tap-quan-ly.sql`** — file này thêm cột
   `explanation` (giải thích đáp án) và mở quyền cho trang quản lý câu hỏi hoạt động
3. Mở tab mới khác, chạy tiếp dòng sau để thêm cột `email`:
   ```sql
   alter table quiz_results add column if not exists email text;
   ```

### 1. Chế độ Ôn tập (`/practice`)

Làm không giới hạn số lần, không tính vào báo cáo, không cần điền tên/email. Có thể chọn ôn theo
từng chủ đề riêng hoặc tất cả, chọn số câu (10/25/50/tất cả). Sau mỗi câu, hiện ngay đáp án đúng
và phần giải thích (nếu bạn đã nhập). Truy cập qua link "Ôn tập trước khi thi" ở trang chủ.

### 2. Giải thích đáp án

Mỗi câu hỏi giờ có thêm 1 trường "Giải thích" (không bắt buộc). Nhập qua trang **Quản lý câu
hỏi** (xem mục 3). Nếu để trống, hệ thống chỉ hiện đúng/sai như trước, không hiện gì thêm.

### 3. Quản lý câu hỏi ngay trên web (`/admin-questions`)

Không cần vào Supabase gõ SQL nữa — thêm/sửa/xoá câu hỏi ngay trên web, có ô tìm kiếm theo nội
dung hoặc chủ đề. Trang này được bảo vệ bằng mật khẩu admin giống trang Báo cáo/Dashboard.

**Lưu ý về bảo mật (đọc kỹ)**: trang này được khoá ở tầng giao diện web (phải đăng nhập mật khẩu
mới thấy trang), nhưng bản thân "chìa khoá" kết nối tới Supabase (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
vẫn là khoá công khai, ai cũng có thể lấy được từ trình duyệt. Vì đã mở quyền ghi cho bảng
`questions` để tính năng này hoạt động, về lý thuyết một người có kỹ thuật (mở Console trình
duyệt) vẫn có thể chỉnh sửa được ngân hàng câu hỏi mà không cần qua trang đăng nhập. Với một
công cụ đào tạo nội bộ, rủi ro này ở mức thấp (không có dữ liệu cá nhân/tài chính nhạy cảm bị lộ,
chỉ là nội dung câu hỏi). Nếu sau này bạn cần mức bảo mật cao hơn (ví dụ khoá hẳn ở tầng server),
nói mình biết để nâng cấp thêm.

### 4. Email làm định danh (thay vì chỉ gõ tên)

Trang chủ giờ yêu cầu nhập thêm **email công ty**, dùng để kiểm tra trùng thay vì chỉ dựa vào tên
gõ tay (khó gõ sai/trùng hơn tên). Báo cáo, lịch sử, và file Excel xuất ra đều có thêm cột Email.

**Lưu ý cần biết**: đây **không phải** đăng nhập thật (không gửi email xác minh, không mật khẩu
riêng cho từng người) — chỉ là dùng email làm định danh đáng tin hơn tên. Ai đó vẫn có thể gõ
email của người khác nếu cố tình. Nếu cần xác thực chặt hơn (gửi mã OTP qua email trước khi cho
làm bài), đây là một bước nâng cấp lớn hơn, nói mình biết nếu bạn muốn làm.

## Cập nhật mới: trang Dashboard trực quan

Thêm 1 trang **Dashboard** (`/dashboard`) hiện biểu đồ trực quan, không cần cấu hình gì thêm — dữ
liệu lấy thẳng từ Supabase như trang Báo cáo. Gồm:

- Các số liệu tổng quan (lượt làm bài, điểm TB, cao/thấp nhất, thời gian làm bài trung bình)
- Biểu đồ **phân bố điểm số** (bao nhiêu người đạt mỗi khoảng điểm)
- Biểu đồ **xu hướng điểm theo từng lượt nộp bài**
- Biểu đồ tròn **tỷ lệ đạt / chưa đạt** (ngưỡng 50%, có thể nhờ mình đổi ngưỡng nếu cần)
- Biểu đồ **top 10 câu hỏi hay bị sai nhất**

Cũng có ô chọn tháng như trang Báo cáo, và cũng được bảo vệ bằng mật khẩu admin (không cần cấu
hình thêm gì — dùng chung `ADMIN_PASSWORD` đã có).

Truy cập qua link **"Xem dashboard"** ở trang chủ hoặc trang Báo cáo.

## Cập nhật mới: tự động tách bài test theo từng tháng

Từ giờ, hệ thống **tự động coi mỗi tháng là một đợt thi riêng** — không cần bạn phải tay xoá dữ
liệu mỗi tháng nữa:

- Ai đã làm bài trong tháng này, tháng **sau** vẫn làm lại được bình thường (không bị báo trùng
  tên) — hệ thống chỉ chặn trùng tên **trong cùng 1 tháng**
- Trang **Báo cáo** mặc định chỉ hiện kết quả của **tháng hiện tại**, có ô chọn ở đầu trang để
  xem lại báo cáo của các tháng trước, hoặc chọn "Tất cả các tháng" để xem gộp toàn bộ
- Dữ liệu các tháng cũ **không bị xoá** — vẫn nằm nguyên trong database để đối chiếu khi cần,
  chỉ là không hiện mặc định nữa thôi

### Bắt buộc phải chạy SQL sau khi cập nhật code

1. Vào Supabase → **SQL Editor** → **New query** (tab trống, không dùng lại tab cũ)
2. Dán và chạy toàn bộ nội dung file `supabase-schema.sql` **mới** (đã có thêm cột `period`, và
   tự động gán tháng cho các lượt làm bài cũ dựa theo thời điểm nộp bài)

Sau bước này, các lượt làm bài **cũ** sẽ được tự động xếp vào đúng tháng chúng đã diễn ra (dựa
theo thời điểm nộp bài), và các lượt **mới** sẽ tự gắn đúng tháng hiện tại khi nộp bài.

## Cập nhật mới: thêm cột "Thời gian làm bài" + hướng dẫn xoá dữ liệu cũ

### 1. Báo cáo giờ có đủ các trường bạn cần

Cả trên màn hình lẫn khi **Xuất báo cáo ra Excel**, mỗi người làm bài giờ hiển thị đủ:
- Tên người làm bài
- Số câu trả lời đúng / tổng số câu
- Tỉ lệ phần trăm
- **Thời gian làm bài** (tính từ lúc bắt đầu tới lúc nộp bài — tính năng mới)
- **Thời gian hoàn thành** (thời điểm nộp bài)

**Bắt buộc phải chạy lại 1 dòng SQL** để có cột thời gian làm bài (nếu bỏ qua, web vẫn chạy bình
thường nhưng cột "Thời gian làm bài" sẽ luôn hiện dấu `—`):

1. Vào Supabase → **SQL Editor** → **New query**
2. Dán dòng này → **Run**:
   ```sql
   alter table quiz_results add column if not exists duration_seconds int;
   ```
3. Từ giờ, các lượt làm bài **mới** sẽ tự động ghi lại thời gian làm bài. Các lượt đã làm **trước
   khi** chạy dòng lệnh này sẽ không có dữ liệu thời gian (hiện dấu `—`), không thể lấy lại được.

### 2. Xoá dữ liệu người đã làm bài trước đó

Việc này thực hiện trong **Supabase** (nơi lưu dữ liệu thật), không phải Vercel. Vào Supabase →
**SQL Editor** → **New query**, dán 1 trong 2 lệnh sau tuỳ nhu cầu:

**Xoá tất cả kết quả đã làm (giữ nguyên bộ câu hỏi):**
```sql
delete from quiz_results;
```

**Cảnh báo**: lệnh này xoá vĩnh viễn, không khôi phục lại được. Chỉ chạy khi chắc chắn không cần
giữ lại dữ liệu cũ (ví dụ: đang test thử, muốn xoá sạch để bắt đầu đợt thi thật).

## Cập nhật mới: chặn làm lại + giới hạn thời gian làm bài

### 1. Chặn làm lại

Từ giờ, mỗi **tên** chỉ được làm bài **1 lần**. Nếu ai đó nhập lại đúng tên đã làm rồi (không phân
biệt hoa/thường), web sẽ báo "đã làm bài rồi" kèm điểm cũ, không cho làm tiếp.

**Giới hạn cần biết**: vì web này không có đăng nhập thật cho người làm bài (chỉ nhập tên), nên
việc chặn dựa vào **tên gõ vào** — nếu ai đó cố tình gõ tên hơi khác (thêm dấu cách, viết tắt...)
thì vẫn lách được. Đây là giới hạn không tránh khỏi khi không dùng tài khoản/email thật. Nếu bạn
cần chặt chẽ hơn (ví dụ bắt nhập email công ty), nói mình biết để nâng cấp thêm.

Không cần cấu hình gì thêm — tính năng này luôn bật.

### 2. Giới hạn thời gian làm bài (không bắt buộc)

Nếu muốn bài test chỉ mở trong 1 khoảng thời gian nhất định (ví dụ chỉ mở từ 5/8 đến 10/8), thêm
2 biến môi trường trong Vercel (Settings → Environment Variables):

| Key | Value (ví dụ) |
|---|---|
| `NEXT_PUBLIC_QUIZ_START` | `2026-08-05T08:00:00+07:00` |
| `NEXT_PUBLIC_QUIZ_DEADLINE` | `2026-08-10T17:00:00+07:00` |

- Chỉ cần đặt `NEXT_PUBLIC_QUIZ_DEADLINE` nếu chỉ muốn giới hạn hạn chót, không cần giờ mở
- Không đặt biến nào cả → bài test luôn mở, không giới hạn
- Định dạng giờ Việt Nam: `+07:00`, ví dụ 17h00 ngày 10/8/2026 là `2026-08-10T17:00:00+07:00`
- Thêm/sửa xong nhớ **Redeploy** để áp dụng

Khi ngoài khung giờ, trang chủ sẽ tự khoá nút "Bắt đầu làm bài" và hiện thông báo tương ứng.

## Cập nhật mới: bảo vệ trang Lịch sử và Báo cáo bằng mật khẩu

Từ giờ, chỉ ai biết mật khẩu mới xem được trang **Lịch sử** và **Báo cáo** (danh sách người
làm bài, điểm từng người, câu hỏi hay sai...). Người làm bài bình thường **chỉ thấy điểm của
chính họ** ngay sau khi nộp bài — không thể xem được kết quả của người khác.

### Cách bật tính năng này (bắt buộc phải làm, nếu không web sẽ báo lỗi)

1. Vào Vercel → project của bạn → **Settings** → **Environment Variables**
2. Thêm 1 biến mới:

   | Key | Value |
   |---|---|
   | `ADMIN_PASSWORD` | Mật khẩu bạn tự chọn, ví dụ `DNCT2026!` |

   **Lưu ý quan trọng**: biến này **không có** tiền tố `NEXT_PUBLIC_` — nhờ vậy nó chỉ được kiểm
   tra bí mật ở phía server, không bị lộ ra cho người dùng web thấy được (khác với 2 biến
   Supabase trước đó).
3. Bấm **Save**
4. Vào tab **Deployments** → **Redeploy** bản mới nhất để áp dụng

### Cách dùng

- Bấm vào link **"Xem lịch sử kết quả"** hoặc **"Xem báo cáo tổng hợp"** → web sẽ hiện màn hình
  yêu cầu nhập mật khẩu → nhập đúng `ADMIN_PASSWORD` bạn vừa đặt → vào được trang
- Đăng nhập 1 lần sẽ được nhớ 30 ngày trên trình duyệt đó (không cần đăng nhập lại mỗi lần)
- Có nút **"Đăng xuất"** ở góc trang Lịch sử/Báo cáo nếu muốn thoát phiên đăng nhập

## Cập nhật mới: câu hỏi thật + trang Báo cáo

Nếu bạn đang nâng cấp từ bản trước (đã deploy rồi), làm theo đúng thứ tự sau:

### 1. Cập nhật cấu trúc database

Vào Supabase → **SQL Editor** → **New query**, dán và chạy toàn bộ nội dung file
`supabase-schema.sql` **mới** (ghi đè cấu trúc cũ, không xoá dữ liệu đã có — lệnh dùng
`if not exists` nên chạy lại vẫn an toàn).

### 2. Import câu hỏi thật của bạn

File `import-cau-hoi-thuc-te.sql` chứa toàn bộ câu hỏi thật đã được chuyển đổi sẵn từ file Excel
của bạn (kèm phân loại theo hệ thống/chủ đề). Vào **SQL Editor** → **New query**, dán toàn bộ nội
dung file này → **Run**. File này sẽ tự xoá 5 câu hỏi mẫu cũ và thêm câu hỏi thật vào.

**Lưu ý**: có 1 câu hỏi trong file gốc bị thiếu đáp án D ("Quy định đưa máy cắt vào vị trí vận
hành") — câu này vẫn được import với 3 đáp án, bạn nên vào Table Editor bổ sung đáp án D cho câu
đó nếu cần.

### 3. Cập nhật code lên GitHub và Vercel

- Tải file zip mới, giải nén, upload đè lên đúng các file/thư mục cũ trong repo GitHub (`app/`,
  `package.json`, `supabase-schema.sql`...)
- Vercel sẽ tự động deploy lại sau khi bạn commit

### 4. Xem báo cáo

Vào link web → bấm **"Xem báo cáo tổng hợp"** (có ở trang chủ và trang lịch sử). Trang này cho bạn:

- **Tổng quan**: số lượt làm bài, điểm trung bình, cao nhất, thấp nhất
- **Câu hỏi bị sai nhiều nhất**: xếp hạng theo tỷ lệ trả lời sai
- **Chi tiết từng người**: bấm "Xem" ở mỗi dòng để xem từng câu người đó trả lời đúng/sai gì
- **Xuất báo cáo ra Excel**: bấm nút để tải file `.xlsx` có đủ 3 sheet (Tổng quan, Câu hỏi hay
  sai, Chi tiết) — mở được bằng Excel, Google Sheets

Trang báo cáo này hiện đang **công khai** (ai có link cũng xem được), phù hợp cho việc chia sẻ
nội bộ. Nếu sau này muốn giới hạn chỉ mình bạn xem được, quay lại nói mình biết, mình sẽ thêm lớp
bảo vệ bằng mật khẩu.

## Muốn phát triển thêm sau này

- Thêm bộ đếm giờ cho mỗi câu hỏi
- Thêm nhiều chủ đề/bộ đề khác nhau (thêm cột `category` vào bảng `questions`)
- Thêm đăng nhập thật bằng Supabase Auth thay vì chỉ nhập tên
- Hiện bảng xếp hạng (leaderboard) theo điểm cao nhất

Cứ quay lại hỏi khi bạn muốn làm thêm phần nào trong số này.
