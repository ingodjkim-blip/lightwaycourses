import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lightway Learning",
  description: "Real-time exam preparation classroom by Lightway",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
