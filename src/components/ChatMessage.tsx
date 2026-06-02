"use client"

import type { ChatMessage as ChatMessageType } from "@/types"
import ResultCard from "./ResultCard"

interface Props { message: ChatMessageType }

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user"
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-scale-in`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-purple-200">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? "order-first" : ""}`}>
        {/* Image ref badge */}
        {message.imageRef && (
          <span className="inline-block mb-1 ml-1 text-[10px] text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">
            🖼️ 引用图片分析
          </span>
        )}

        {/* Bubble */}
        <div className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? "bubble-user" : "bubble-ai"}`}>
          {message.content}
        </div>

        {/* Structured result card */}
        {message.result && (
          <div className="mt-3">
            <ResultCard result={message.result} />
          </div>
        )}

        <p className={`text-[10px] text-gray-300 mt-1 ${isUser ? "text-right" : "text-left"}`}>
          {new Date(message.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-white text-xs font-medium">U</span>
        </div>
      )}
    </div>
  )
}
