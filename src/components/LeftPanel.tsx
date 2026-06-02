"use client"

import type { HistoryItem, ImageAnalysis } from "@/types"
import { PLATFORM_MODES } from "@/types"

interface Props {
  imagePreview: string | null
  analysis: ImageAnalysis | null
  history: HistoryItem[]
  onClearHistory: () => void
  onDeleteHistory: (id: string) => void
  onLoadHistory: (item: HistoryItem) => void
  onNewChat: () => void
  manualDesc: string
  onManualDescChange: (v: string) => void
  hasZhipuKey: boolean
}

export default function LeftPanel({ imagePreview, analysis, history, onClearHistory, onDeleteHistory, onLoadHistory, onNewChat, manualDesc, onManualDescChange, hasZhipuKey }: Props) {
  return (
    <aside className="w-72 border-r border-gray-100 bg-white/50 backdrop-blur-sm flex flex-col shrink-0 overflow-hidden">
      {/* New chat */}
      <div className="px-4 py-3 border-b border-gray-100">
        <button onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-gray-900 text-white text-sm font-medium
                     hover:bg-gray-800 transition-all shadow-lg shadow-gray-200">
          <span>✨</span> 新建对话
        </button>
      </div>

      {/* Materials */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">📦 素材库</h3>
        {imagePreview ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-purple-50 border border-purple-100">
              <img src={imagePreview} className="w-10 h-10 rounded-lg object-cover" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">当前素材</p>
                {analysis && <p className="text-[10px] text-purple-500 truncate">{analysis.outfitStyle} · {analysis.colors}</p>}
              </div>
            </div>
            {/* Manual description */}
            <div>
              <p className="text-[10px] text-gray-400 mb-1">
                {!hasZhipuKey ? "💡 未配置智谱Key，请手动描述图片：" : "📝 手动补充描述（可选）："}
              </p>
              <textarea
                value={manualDesc}
                onChange={(e) => onManualDescChange(e.target.value)}
                placeholder="描述图片内容，如：黑色卫衣+灰色运动裤，对镜自拍..."
                rows={2}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-700
                           placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-3">上传图片后显示在这里</p>
        )}
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">📋 历史记录</h3>
          {history.length > 0 && (
            <button onClick={() => { if (confirm("清空所有历史？")) onClearHistory() }}
              className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">清空</button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {history.length === 0 ? (
            <p className="text-[11px] text-gray-300 text-center py-6 px-4">对话记录会显示在这里</p>
          ) : (
            history.map((item) => {
              const p = PLATFORM_MODES[item.platform]
              return (
                <button key={item.id} onClick={() => onLoadHistory(item)}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-gray-100 transition-colors group">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{p.icon}</span>
                    <span className="text-xs font-medium text-gray-700 truncate flex-1">{item.preview}</span>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteHistory(item.id) }}
                      className="text-gray-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">🗑</button>
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-7">
                    <span className="text-[10px] text-gray-400">{p.label}</span>
                    <span className="text-[10px] text-gray-300">{new Date(item.timestamp).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </aside>
  )
}
