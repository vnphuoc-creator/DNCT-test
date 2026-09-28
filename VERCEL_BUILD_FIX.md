# DNCT Test – Vercel build fix

## Đã sửa trong bản này

- Sửa lỗi ESLint `react/no-unescaped-entities` tại `app/admin-questions/page.js`.
- Đồng bộ `eslint-config-next` với Next.js `14.2.35`.
- Khai báo `pdf-parse` và `mammoth` trong `package.json` để API import PDF/Word có dependency rõ ràng.
- Bỏ `package-lock.json` cũ vì lock trước đó không chứa các dependency mới; Vercel sẽ tạo lock phù hợp khi chạy `npm install`.
- Thêm `DEFAULT_SETTINGS` và API `/api/settings` để tương thích với các bản code cũ đang import `DEFAULT_SETTINGS`.
- API import câu hỏi dùng Node runtime và dynamic import cho `pdf-parse`/`mammoth`.

## Deploy Vercel

1. Giải nén và thay toàn bộ nội dung repository bằng bản này.
2. Commit + push lên branch `main`.
3. Vercel Deploy lại.
4. Kiểm tra log phải qua bước `Linting and checking validity of types` và kết thúc bằng `Build Completed`.

Cảnh báo `unrs-resolver ... install scripts` không phải lỗi build. Không cần chạy `npm approve` nếu build vẫn hoàn tất.
