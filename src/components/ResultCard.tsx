"use client"

import { useState } from "react"
import type { CopyResult } from "@/types"

interface Props { result: CopyResult; onRegenerate?: () => void }

function scoreClass(s: number) {
  if (s >= 90) return "text-emerald-600 bg-emerald-50"
  if (s >= 75) return "text-blue-600 bg-blue-50"
  if (s >= 60) return "text-amber-600 bg-amber-50"
  return "text-gray-400 bg-gray-50"
}

export default function ResultCard({ result, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false)
  const cx = scoreClass(result.score)

  const copyAll = () => {
    const text = `${result.title}\n\n${result.body}\n\n🏷 ${result.tags.map(t => `#${t}`).join(" ")}\n📸 封面：${result.coverText}\n🎬 拍摄：${result.shootingAdvice}`
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="xhs-card animate-scale-in">
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-bold text-gray-900 leading-snug flex-1">{result.title}</h3>
          <div className={`shrink-0 px-2.5 py-1 rounded-xl text-xs font-bold ${cx}`}>{result.score}</div>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">{result.reason}</p>
      </div>
      <div className="px-4 pb-3"><p className="xhs-body whitespace-pre-wrap">{result.body}</p></div>
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {result.tags.map((t, i) => <span key={i} className="xhs-tag">#{t}</span>)}
      </div>
      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
        <div className="bg-amber-50/70 rounded-xl p-2.5">
          <p className="text-[10px] text-amber-500 font-medium mb-0.5">📸 封面文案</p>
          <p className="text-xs text-amber-800 font-medium">{result.coverText}</p>
        </div>
        <div className="bg-blue-50/70 rounded-xl p-2.5">
          <p className="text-[10px] text-blue-500 font-medium mb-0.5">🎬 拍摄建议</p>
          <p className="text-xs text-blue-800">{result.shootingAdvice}</p>
        </div>
      </div>
      <div className="flex border-t border-gray-50">
        <button onClick={copyAll}
          className={`flex-1 py-2.5 text-xs font-semibold transition-all ${copied ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-500 hover:bg-purple-50 hover:text-purple-600"}`}>
          {copied ? "✅ 已复制全文" : "📋 一键复制全文"}
        </button>
        {onRegenerate && (
          <button onClick={onRegenerate}
            className="flex-1 py-2.5 text-xs font-semibold text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all border-l border-gray-50">
            🔄 重新生成
          </button>
        )}
      </div>
    </div>
  )
}
