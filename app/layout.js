import "./globals.css";

export const metadata = {
  title: "Bài Test Kiến Thức",
  description: "Web bài test kiến thức tự chấm điểm, dựng bằng Next.js + Supabase",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="/" className="brand-badge">
          <img src="/logo.png" alt="Logo công ty" />
        </a>
        <div className="shell">{children}</div>
      </body>
    </html>
  );
}
