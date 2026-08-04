import "./globals.css";

export const metadata = {
  title: "Bài Test Kiến Thức",
  description: "Web bài test kiến thức tự chấm điểm, dựng bằng Next.js + Supabase",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <div className="shell">{children}</div>
      </body>
    </html>
  );
}
