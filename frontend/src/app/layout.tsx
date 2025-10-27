import type { Metadata } from "next";
import { Toaster } from "sonner";
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
      <body className="antialiased font-sans ">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
