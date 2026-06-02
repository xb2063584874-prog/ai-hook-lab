"use client"

import { useState, useRef, useEffect } from "react"

interface Props {
  onSend: (text: string, withImage: boolean) => void
  disabled: boolean
  hasImage: boolean
}

export default function ChatInput({ onSend, disabled, hasImage }: Props) {
  const [text, setText] = useState("")
  const [withImage, setWithImage] = useState(hasImage)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setWithImage(hasImage) }, [hasImage])

  function send() {
    if (!text.trim() || disabled) return
    onSend(text.trim(), withImage)
    setText("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  return (
    <div className="px-4 py-3">
      {hasImage && (
        <div className="flex mb-2">
          <button
            onClick={() => setWithImage(!withImage)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all
              ${withImage ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-white/60 text-gray-400 border border-gray-200"}`}
          >
            <span>🖼️</span> {withImage ? "已引用图片" : "引用图片分析"}
          </button>
        </div>
      )}
      <div className="glass rounded-2xl flex items-end gap-2 p-2 focus-within:shadow-glow focus-within:border-purple-300 transition-all">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px" }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="输入文案需求，例如：按照这张图生成得物穿搭文案..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-gray-700 placeholder:text-gray-300
                     focus:outline-none disabled:opacity-40 max-h-32"
        />
        <button
          onClick={send}
          disabled={!text.trim() || disabled}
          className="shrink-0 w-9 h-9 rounded-xl gradient-brand text-white flex items-center justify-center
                     hover:shadow-lg hover:shadow-purple-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
        </button>
      </div>
    </div>
  )
}
