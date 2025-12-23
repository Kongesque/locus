import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/layout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZoneNet - AI Object Counter & Analytics",
  description:
    "Real-time object counting and video analytics with custom region tracking using YOLO11",
  icons: {
    icon: "/favicon.png",
  },
};

// Script to prevent theme flash on initial load
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme') || 'dark';
      document.documentElement.classList.add(theme);
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-sidebar-foreground h-screen overflow-hidden flex flex-col`}
      >
        <Providers>
          <Header />
          <div className="flex flex-1 overflow-hidden">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
