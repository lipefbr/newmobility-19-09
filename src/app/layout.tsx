import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NewMobility - BackOffice | Sistema de CashBack Multinível",
  description: "NewMobility BackOffice - Plataforma de CashBack Multinível com Mobilidade Urbana, Refeição, Farmácia, Shopping e muito mais.",
  keywords: ["NewMobility", "CashBack", "MMN", "Multinível", "Mobilidade Urbana", "MLM"],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23059669'/><text x='50' y='68' font-size='50' font-weight='bold' text-anchor='middle' fill='white'>NM</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Script to apply dark mode class before paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = JSON.parse(localStorage.getItem('newmobility-auth'));
                  if (stored && stored.state && stored.state.darkMode) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
