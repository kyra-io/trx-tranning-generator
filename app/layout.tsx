import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { BottomNavigation } from "@/components/navigation/bottom-navigation";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TRX Workouts",
  description: "Generate and track personal TRX workouts",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-zinc-200 font-sans text-zinc-900">
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-zinc-50">
          <header className="px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-3">
            <span className="text-sm font-bold tracking-[0.18em] text-zinc-900">
              TRX
            </span>
          </header>
          <main className="flex-1 px-5 pt-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
            {children}
          </main>
          <BottomNavigation />
        </div>
      </body>
    </html>
  );
}
