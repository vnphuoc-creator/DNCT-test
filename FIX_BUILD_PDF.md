# Fix build PDF/Word import

Lỗi Vercel `Module not found: Can't resolve 'pdf-parse'` xảy ra khi deployment đang có endpoint `/app/api/admin/parse-questions/route.js` nhưng `pdf-parse` chưa nằm trong `package.json`.

Bản này đã:
- thêm `pdf-parse` vào dependencies;
- thêm endpoint tương thích `/api/admin/parse-questions`;
- ép endpoint chạy Node.js runtime;
- giữ importer hiện tại trong trang Ngân hàng câu hỏi với PDF (`pdfjs-dist`) và Word (`mammoth`).

Sau khi cập nhật source trên Vercel, Vercel sẽ tự cài lại dependency từ `package.json`.
