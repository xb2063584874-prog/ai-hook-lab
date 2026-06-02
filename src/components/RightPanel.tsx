"use client"

import { useState, useRef, useCallback } from "react"
import type { ImageAnalysis } from "@/types"

interface Props {
  onImageChange: (base64: string, mimeType: string) => void
  onImageRemove: () => void
  analysis: ImageAnalysis | null
  isAnalyzing: boolean
  imagePreview: string | null
  analysisError: string | null
  onReanalyze: () => void
  hasZhipuKey: boolean
}

// Simple frontend compression: max 1024px, 0.7 quality
async function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const maxW = 1024; let w = img.width, h = img.height
      if (w > maxW) { h = Math.round(h * (maxW / w)); w = maxW }
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, w, h)
      resolve({ base64: canvas.toDataURL(file.type || "image/jpeg", 0.7).split(",")[1], mimeType: file.type || "image/jpeg" })
    }
    img.src = URL.createObjectURL(file)
  })
}

export default function RightPanel({ onImageChange, onImageRemove, analysis, isAnalyzing, imagePreview, analysisError, onReanalyze, hasZhipuKey }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { alert("请上传图片"); return }
    setCompressing(true)
    try {
      const { base64, mimeType } = await compressImage(file)
      onImageChange(base64, mimeType)
    } catch { alert("图片处理失败") }
    finally { setCompressing(false) }
  }, [onImageChange])

  return (
    <aside className="w-80 border-l border-gray-100 bg-white/50 backdrop-blur-sm flex flex-col shrink-0 overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">📷 图片分析</h2>
        {!hasZhipuKey && <span className="text-[9px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">需配置Key</span>}
      </div>

      <div className="p-3 flex-1">
        {imagePreview ? (
          <div className="space-y-3">
            <div className="relative group">
              <div className="rounded-2xl overflow-hidden shadow-card border border-gray-100">
                <img src={imagePreview} alt="预览" className="w-full object-cover" />
              </div>
              <button onClick={onImageRemove}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-gray-900/70 text-white text-xs
                           opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur">
                ✕
              </button>
            </div>

            {compressing && <div className="text-xs text-gray-400 text-center">压缩中...</div>}

            {isAnalyzing && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-purple-50 rounded-2xl animate-fade-in">
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-purple-600 font-medium">智谱 GLM-4V 分析中...</span>
              </div>
            )}

            {analysisError && !isAnalyzing && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-[11px] text-red-600 leading-relaxed">
                {analysisError}
              </div>
            )}

            {!isAnalyzing && !compressing && (
              <button onClick={onReanalyze} className="w-full py-2 rounded-xl bg-gray-100 text-gray-500 text-xs hover:bg-gray-200 transition-colors">
                🔄 重新分析
              </button>
            )}

            {analysis && (
              <div className="animate-fade-in space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">分析完成</span>
                </div>
                <div className="glass rounded-2xl p-3 space-y-1.5 text-xs">
                  {([
                    ["🎨 风格", analysis.outfitStyle], ["🏷️ 品牌", analysis.brandElements],
                    ["🌈 配色", analysis.colors], ["📐 版型", analysis.fit],
                    ["📍 场景", analysis.scene], ["📸 角度", analysis.angle],
                    ["✨ 封面点", analysis.coverHook], ["👟 得物调性", analysis.dewuTone],
                    ["💼 商单类型", analysis.commercialValue], ["⚠️ 风险", analysis.risk],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="flex gap-2"><span className="text-gray-400 shrink-0 w-[4rem] text-[11px]">{label}</span><span className="text-gray-700 font-medium text-[11px]">{value || "—"}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`drag-zone h-64 flex flex-col items-center justify-center cursor-pointer ${isDragging ? "drag-active" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f) }}>
            <div className="text-4xl mb-3">{compressing ? "⏳" : "📁"}</div>
            <p className="text-sm font-medium text-gray-500">{compressing ? "压缩中..." : "拖拽图片到这里"}</p>
            <p className="text-[11px] text-gray-300 mt-1">自动压缩 · JPG/PNG/WebP ≤10MB</p>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>
    </aside>
  )
}
