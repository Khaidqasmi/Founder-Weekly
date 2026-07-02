import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { AppShell } from "@/components/app-shell"
import { DevToolsSync } from "@/components/devtools-sync"
import "./globals.css"

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Ecom Panel — Ecommerce Analytics Dashboard",
  description: "Track Shopify orders, Meta Ads, Google Analytics, courier performance, revenue, ROAS, and business reports in one clean panel.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${jakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DevToolsSync />
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  )
}
