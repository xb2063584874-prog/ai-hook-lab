"use client"

export default function Header() {
  return (
    <header className="h-14 glass-strong flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-purple-200">
          <span className="text-white text-sm font-bold">H</span>
        </div>
        <div>
          <span className="font-bold text-[15px] text-gray-800">Hook Lab</span>
          <span className="text-[10px] text-gray-400 ml-1.5 font-medium">AI 文案工作台</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[11px] text-gray-400 font-medium">DeepSeek</span>
      </div>
    </header>
  )
}
