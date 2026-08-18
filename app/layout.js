import "./globals.css";
import FlyingPlane from "./components/FlyingPlane";
import ChatWidget from "./components/ChatWidget";

export const metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  title: "Bài Test Kiến Thức",
  description: "",
  openGraph: {
    title: "Bài Test Kiến Thức",
    description: "",
    images: ["/og-image.png"],
  },
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
        <FlyingPlane />
        <a href="/" className="brand-badge">
          <img src="/logo.png" alt="Logo công ty" />
        </a>
        <div className="shell">{children}</div>
        <ChatWidget />
      </body>
    </html>
  );
}
