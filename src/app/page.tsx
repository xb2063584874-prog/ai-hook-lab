"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { PlatformMode, ContentType, CopyStyle, ChatMessage, ImageAnalysis, HistoryItem, CopyResult } from "@/types"
import Header from "@/components/Header"
import LeftPanel from "@/components/LeftPanel"
import RightPanel from "@/components/RightPanel"
import PlatformModeBar from "@/components/PlatformModeBar"
import ChatMessageComponent from "@/components/ChatMessage"
import ChatInput from "@/components/ChatInput"
import ResultCard from "@/components/ResultCard"

const STORAGE_KEY = "ai-hook-lab-v4"
const ANALYSIS_CACHE_KEY = "ai-hook-lab-analysis-cache"
const MAX_HISTORY = 30

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback } catch { return fallback }
}
function saveJson(key: string, data: unknown) { try { localStorage.setItem(key, JSON.stringify(data)) } catch {} }

export default function HomePage() {
  // ---- Chat ----
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---- Platform / Content / Style ----
  const [platform, setPlatform] = useState<PlatformMode>("dewu-jipai")
  const [contentType, setContentType] = useState<ContentType>("zhongcao")
  const [style, setStyle] = useState<CopyStyle>("zhenshi")

  // ---- Image ----
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState("image/jpeg")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [manualDesc, setManualDesc] = useState("")
  const [hasZhipuKey, setHasZhipuKey] = useState(true)

  // ---- Copy result (for right panel) ----
  const [copyResult, setCopyResult] = useState<CopyResult | null>(null)
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false)

  // ---- History ----
  const [history, setHistory] = useState<HistoryItem[]>([])
  useEffect(() => { setHistory(loadJson(STORAGE_KEY, [])) }, [])
  useEffect(() => { saveJson(STORAGE_KEY, history) }, [history])

  // ---- Scroll ----
  const chatEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, isLoading])

  // ---- Auto-analyze on upload (with caching) ----
  useEffect(() => {
    if (!imageBase64) return
    let cancelled = false
    setIsAnalyzing(true)
    setAnalysisError(null)
    setAnalysis(null)

    // Check cache first
    const cacheKey = imageBase64.slice(0, 200)
    const cached = loadJson<{ analysis: ImageAnalysis; ts: number } | null>(`${ANALYSIS_CACHE_KEY}-${cacheKey}`, null)
    if (cached && Date.now() - cached.ts < 3600000) {
      if (!cancelled) { setAnalysis(cached.analysis); setIsAnalyzing(false) }
      return
    }

    ;(async () => {
      try {
        const res = await fetch("/api/analyze-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64, imageMimeType }),
        })
        const data = await res.json()
        if (cancelled) return
        if (data.analysis) {
          setAnalysis(data.analysis)
          setHasZhipuKey(true)
          // Cache it
          saveJson(`${ANALYSIS_CACHE_KEY}-${cacheKey}`, { analysis: data.analysis, ts: Date.now() })
        } else if (data.error) {
          setAnalysisError(data.error)
          if (data.error.includes("未配置")) setHasZhipuKey(false)
        }
      } catch {
        if (!cancelled) setAnalysisError("网络异常，分析失败")
      } finally {
        if (!cancelled) setIsAnalyzing(false)
      }
    })()
    return () => { cancelled = true }
  }, [imageBase64, imageMimeType])

  // ---- Image handlers ----
  const handleImageChange = useCallback((b64: string, mime: string) => {
    setImageBase64(b64); setImageMimeType(mime); setImagePreview(`data:${mime};base64,${b64}`)
  }, [])
  const handleImageRemove = useCallback(() => {
    setImageBase64(null); setImagePreview(null); setAnalysis(null); setAnalysisError(null); setCopyResult(null)
  }, [])
  const handleReanalyze = useCallback(() => {
    if (imagePreview) {
      const b64 = imagePreview.split(",")[1]
      if (b64) { setImageBase64(b64); setImageMimeType("image/jpeg") }
    }
  }, [imagePreview])

  // ---- Build image context string ----
  const getImageContext = useCallback(() => {
    if (analysis) {
      return `【智谱视觉分析】
穿搭：${analysis.outfitStyle} | 品牌：${analysis.brandElements}
配色：${analysis.colors} | 版型：${analysis.fit}
场景：${analysis.scene} | 角度：${analysis.angle}
封面吸睛点：${analysis.coverHook} | 得物调性：${analysis.dewuTone}
商业价值：${analysis.commercialValue} | 风险：${analysis.risk}`
    }
    if (manualDesc.trim()) return manualDesc.trim()
    return ""
  }, [analysis, manualDesc])

  // ---- Generate copy (called from chat OR regenerate) ----
  const generateCopy = useCallback(async (userInput: string, imgCtx: string) => {
    setIsGeneratingCopy(true)
    setCopyResult(null)
    try {
      const res = await fetch("/api/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput,
          platform,
          contentType,
          style,
          imageAnalysis: analysis,
          manualImageDescription: manualDesc.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.result) {
        setCopyResult(data.result)
        return data.result
      } else if (data.error) {
        setError(data.error)
      }
    } catch {
      setError("文案生成失败")
    } finally {
      setIsGeneratingCopy(false)
    }
    return null
  }, [platform, contentType, style, analysis, manualDesc])

  // ---- Send message ----
  const handleSend = useCallback(async (text: string, withImage: boolean) => {
    if (!text || isLoading) return
    setError(null)
    const useImg = withImage && !!getImageContext()
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text, imageRef: useImg, timestamp: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      // If image context available and user wants copy generation, use generate-copy
      const isCopyReq = /生成|文案|标题|种草|穿搭|商单|寄拍|写|出文案/.test(text)
      if (useImg && isCopyReq) {
        const result = await generateCopy(text, getImageContext())
        const aiMsg: ChatMessage = {
          id: `a-${Date.now()}`, role: "assistant",
          content: result ? `已生成「${result.title}」文案，查看右侧面板 →` : "已生成文案",
          result, timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, aiMsg])
      } else {
        // General chat
        const apiMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content, imageRef: m.imageRef }))
        const res = await fetch("/api/chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, platform, imageContext: useImg ? getImageContext() : undefined }),
        })
        const data = await res.json()
        if (!res.ok || data.error) { setError(data.error || `请求失败 ${res.status}`); return }
        const aiMsg: ChatMessage = { id: `a-${Date.now()}`, role: "assistant", content: data.message, result: data.result || null, timestamp: Date.now() }
        setMessages((prev) => [...prev, aiMsg])
        if (data.result) setCopyResult(data.result)
      }
    } catch { setError("网络请求失败") }
    finally { setIsLoading(false) }
  }, [messages, platform, isLoading, getImageContext, generateCopy])

  // ---- History ----
  const saveConversation = useCallback(() => {
    if (messages.length === 0) return
    const first = messages.find((m) => m.role === "user")
    if (!first) return
    setHistory((prev) => [{ id: `hist-${Date.now()}`, timestamp: Date.now(), platform, preview: first.content.slice(0, 30), messageCount: messages.length, messages: [...messages] }, ...prev].slice(0, MAX_HISTORY))
  }, [messages, platform])
  useEffect(() => { if (messages[messages.length - 1]?.role === "assistant") { const t = setTimeout(saveConversation, 500); return () => clearTimeout(t) } }, [messages, saveConversation])

  const handleLoadHistory = useCallback((item: HistoryItem) => { setMessages(item.messages); setPlatform(item.platform); setError(null) }, [])
  const handleClearHistory = useCallback(() => { setHistory([]); saveJson(STORAGE_KEY, []) }, [])
  const handleDeleteHistory = useCallback((id: string) => { setHistory((p) => { const u = p.filter((i) => i.id !== id); saveJson(STORAGE_KEY, u); return u }) }, [])
  const handleNewChat = useCallback(() => { setMessages([]); setError(null); setCopyResult(null) }, [])

  // ---- Content type & style selectors for chat ----
  const CONTENT_OPTS = ["种草笔记", "带货文案", "封面标题", "直播引流", "品牌商单"]
  const STYLE_OPTS = ["真实分享", "高级质感", "网感俏皮", "商业带货", "反差冲突"]

  return (
    <div className="h-screen flex flex-col max-w-[1440px] mx-auto">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT */}
        <LeftPanel
          imagePreview={imagePreview} analysis={analysis} history={history}
          onClearHistory={handleClearHistory} onDeleteHistory={handleDeleteHistory}
          onLoadHistory={handleLoadHistory} onNewChat={handleNewChat}
          manualDesc={manualDesc} onManualDescChange={setManualDesc}
          hasZhipuKey={hasZhipuKey}
        />

        {/* CENTER */}
        <div className="flex-1 flex flex-col min-w-0 border-x border-gray-100">
          {/* Platform bar + options */}
          <div className="shrink-0 border-b border-gray-100">
            <PlatformModeBar value={platform} onChange={setPlatform} />
            {/* Content type + style pills */}
            <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
              <span className="text-[10px] text-gray-400 shrink-0">类型：</span>
              {(["zhongcao","daihuo","fengmian","zhibo","pinpai"] as ContentType[]).map((k, i) => (
                <button key={k} onClick={() => setContentType(k)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all
                    ${contentType === k ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-white text-gray-400 border border-gray-200 hover:border-gray-300"}`}>
                  {CONTENT_OPTS[i]}
                </button>
              ))}
              <span className="text-[10px] text-gray-300 mx-1">|</span>
              <span className="text-[10px] text-gray-400 shrink-0">风格：</span>
              {(["zhenshi","gaoji","wanggan","shangye","fancha"] as CopyStyle[]).map((k, i) => (
                <button key={k} onClick={() => setStyle(k)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all
                    ${style === k ? "bg-pink-100 text-pink-700 border border-pink-200" : "bg-white text-gray-400 border border-gray-200 hover:border-gray-300"}`}>
                  {STYLE_OPTS[i]}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {messages.length === 0 && !isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm animate-fade-in">
                  <div className="w-16 h-16 rounded-3xl gradient-brand flex items-center justify-center mx-auto mb-5 shadow-xl shadow-purple-200">
                    <span className="text-3xl">🪝</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">AI Hook Lab</h2>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {imagePreview ? "图片已就绪，输入指令生成文案 →" : "右侧上传穿搭图自动分析，在这里输入指令生成爆款文案"}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {["按这张图生成得物穿搭文案", "写小红书种草笔记", "来一条抖音带货口播"].map((h) => (
                      <button key={h} onClick={() => handleSend(h, !!getImageContext())}
                        className="px-4 py-2 rounded-full bg-white border border-gray-200 text-xs text-gray-500
                                   hover:border-purple-300 hover:text-purple-600 hover:shadow-sm transition-all">
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg) => <ChatMessageComponent key={msg.id} message={msg} />)}

            {isLoading && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shrink-0 shadow-md shadow-purple-200">
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
                <div className="bubble-ai px-5 py-3 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }}/>
                  <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "120ms" }}/>
                  <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "240ms" }}/>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center animate-fade-in">
                <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-2.5 text-xs text-red-600 flex items-center gap-2">
                  <span>⚠️</span> <span>{error}</span>
                  <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <ChatInput onSend={handleSend} disabled={isLoading} hasImage={!!getImageContext()} />
        </div>

        {/* RIGHT */}
        <RightPanel
          onImageChange={handleImageChange}
          onImageRemove={handleImageRemove}
          analysis={analysis}
          isAnalyzing={isAnalyzing}
          imagePreview={imagePreview}
          analysisError={analysisError}
          onReanalyze={handleReanalyze}
          hasZhipuKey={hasZhipuKey}
        />
      </div>

      {/* Result overlay: shown when copyResult exists and messages exist */}
      {copyResult && (
        <div className="fixed bottom-24 right-8 z-40 animate-slide-up">
          <ResultCard result={copyResult} onRegenerate={() => generateCopy("重新生成", getImageContext())} />
          <button onClick={() => setCopyResult(null)}
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gray-800 text-white text-xs flex items-center justify-center hover:bg-gray-900 shadow-lg">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
