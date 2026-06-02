import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "AI Hook Lab — 爆款文案工作台",
  description: "小红书·得物·抖音 AI 穿搭文案生成器 | 图片分析 + 智能写作",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="h-screen overflow-hidden bg-app text-gray-800 antialiased">
        {children}
      </body>
    </html>
  )
}
