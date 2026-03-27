import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cripta Dashboard",
  description: "Financial dashboard for crypto portfolio tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="bg-gray-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
