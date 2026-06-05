import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Word of the Week",
  description: "AI-generated vocabulary words delivered weekly to your inbox",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b">
          <div className="max-w-2xl mx-auto px-8 py-3 flex gap-6 text-sm font-medium">
            <Link href="/" className="hover:text-zinc-600">Dashboard</Link>
            <Link href="/recipients" className="hover:text-zinc-600">Recipients</Link>
            <Link href="/settings" className="hover:text-zinc-600">Settings</Link>
            <Link href="/preview" className="hover:text-zinc-600">Preview</Link>
            <Link href="/history" className="hover:text-zinc-600">History</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
