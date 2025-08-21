import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GeneraPix Calendar App",
  description: "AI-powered image generation calendar application",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* CDN preconnect for faster image loading */}
        <link rel="preconnect" href="https://nkjihejhyrquyegmqimi.supabase.co" />
        <link rel="dns-prefetch" href="https://nkjihejhyrquyegmqimi.supabase.co" />
      </head>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}
