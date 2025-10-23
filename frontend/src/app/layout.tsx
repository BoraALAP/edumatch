import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduMatch",
  description: "Practice English with real conversations and AI feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
