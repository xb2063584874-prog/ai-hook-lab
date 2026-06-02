// ==================== 平台模式 ====================

export type PlatformMode =
  | "dewu-jipai" | "dewu-daily" | "dewu-shangdan" | "xiaohongshu" | "douyin"

export const PLATFORM_MODES: Record<PlatformMode, { label: string; icon: string; desc: string }> = {
  "dewu-jipai":    { label: "得物寄拍", icon: "📸", desc: "寄拍模特穿搭文案" },
  "dewu-daily":    { label: "得物日常", icon: "👟", desc: "日常球鞋/潮牌分享" },
  "dewu-shangdan": { label: "得物商单", icon: "💼", desc: "品牌商单专业文案" },
  "xiaohongshu":   { label: "小红书",   icon: "📕", desc: "种草笔记深度文案" },
  "douyin":        { label: "抖音",     icon: "🎵", desc: "短视频口播/带货文案" },
}

export type ContentType = "zhongcao" | "daihuo" | "fengmian" | "zhibo" | "pinpai"
export const CONTENT_TYPES: Record<ContentType, { label: string; desc: string }> = {
  zhongcao: { label: "种草笔记", desc: "真实分享推荐" },
  daihuo:   { label: "带货文案", desc: "促单转化话术" },
  fengmian: { label: "封面标题", desc: "一眼想点开" },
  zhibo:    { label: "直播引流", desc: "拉观众进直播间" },
  pinpai:   { label: "品牌商单", desc: "专业品牌植入" },
}

export type CopyStyle = "zhenshi" | "gaoji" | "wanggan" | "shangye" | "fancha"
export const COPY_STYLES: Record<CopyStyle, { label: string; desc: string }> = {
  zhenshi:  { label: "真实分享", desc: "素人视角，真诚可信" },
  gaoji:    { label: "高级质感", desc: "极简克制，大牌腔调" },
  wanggan:  { label: "网感俏皮", desc: "轻松幽默，年轻人爱看" },
  shangye:  { label: "商业带货", desc: "直击痛点，强促单" },
  fancha:   { label: "反差冲突", desc: "打破预期，制造话题" },
}

// ==================== 图片分析（智谱 GLM-4V） ====================

export interface ImageAnalysis {
  outfitStyle: string
  brandElements: string
  colors: string
  fit: string
  scene: string
  angle: string
  coverHook: string
  dewuTone: string
  commercialValue: string
  risk: string
}

export interface AnalyzeImageRequest { imageBase64: string; imageMimeType: string }
export interface AnalyzeImageResponse { analysis: ImageAnalysis | null; error?: string; cached?: boolean }

// ==================== 文案生成 ====================

export interface GenerateCopyRequest {
  userInput: string
  platform: PlatformMode
  contentType: ContentType
  style: CopyStyle
  imageAnalysis?: ImageAnalysis | null
  manualImageDescription?: string
}

export interface CopyResult {
  title: string
  body: string
  tags: string[]
  coverText: string
  shootingAdvice: string
  score: number
  reason: string
}

export interface GenerateCopyResponse { result: CopyResult | null; error?: string }

// ==================== 聊天（保留） ====================

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  imageRef?: boolean
  result?: CopyResult | null
  timestamp: number
}

export interface ChatRequest {
  messages: Array<{ role: "user" | "assistant"; content: string; imageRef?: boolean }>
  platform: PlatformMode
  imageContext?: string
}
export interface ChatResponse { message: string; result?: CopyResult | null; error?: string }

// ==================== 历史 ====================

export interface HistoryItem {
  id: string; timestamp: number; platform: PlatformMode
  preview: string; messageCount: number; messages: ChatMessage[]
}
