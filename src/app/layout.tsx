import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const sans = Roboto({
  variable: "--font-sans",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Salthub Report Card",
  description: "Upload structured SaltHub exports and generate audience-specific report card previews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
