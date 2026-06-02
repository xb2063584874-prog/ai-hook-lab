import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import type { ChatRequest, ChatResponse, CopyResult } from "@/types"
import { buildCopySystemPrompt } from "@/lib/prompt"

function extractJson(text: string): string {
  const md = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (md) return md[1].trim()
  const b = text.indexOf("{"), e = text.lastIndexOf("}")
  if (b !== -1 && e !== -1 && e > b) return text.slice(b, e + 1)
  return text
}

function parseResult(data: unknown): CopyResult | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  if (!d.title && !d.body) return null
  return {
    title: String(d.title || "").slice(0, 60),
    body: String(d.body || "").slice(0, 800),
    tags: Array.isArray(d.tags) ? d.tags.slice(0, 8).map(String) : [],
    coverText: String(d.coverText || "").slice(0, 30),
    shootingAdvice: String(d.shootingAdvice || "").slice(0, 60),
    score: Math.min(100, Math.max(0, Number(d.score) || 80)),
    reason: String(d.reason || "").slice(0, 40),
  }
}

function isCopyRequest(text: string): boolean {
  const k = ["生成", "文案", "标题", "种草", "穿搭", "商单", "寄拍", "写一篇", "帮我写", "写文案", "出文案", "来一段", "封面", "正文", "标签"]
  return k.some((w) => text.toLowerCase().includes(w.toLowerCase()))
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json().catch(() => null)
    if (!body?.messages?.length) return NextResponse.json({ message: "", error: "消息为空" } satisfies ChatResponse, { status: 400 })

    const { messages, platform, imageContext } = body
    const lastUser = [...messages].reverse().find((m) => m.role === "user")
    const needStructured = lastUser ? isCopyRequest(lastUser.content) : false

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey || apiKey.startsWith("sk-your-")) throw new Error("DEEPSEEK_API_KEY 未配置")

    const client = new OpenAI({ baseURL: "https://api.deepseek.com", apiKey })
    const systemPrompt = buildCopySystemPrompt(platform, !!imageContext)
    const ctx = imageContext ? `\n\n【图片上下文】\n${imageContext}` : ""

    const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt + ctx },
      ...messages.slice(-20).map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
    ]

    let raw = ""; let lastErr: Error | null = null
    for (const model of ["deepseek-v4-flash", "deepseek-chat"]) {
      try {
        const c = await client.chat.completions.create({
          model, messages: apiMessages, temperature: 0.85, max_tokens: 2048,
          ...(needStructured ? { response_format: { type: "json_object" } as const } : {}),
        }, { timeout: 30000, maxRetries: 1 })
        raw = c.choices[0]?.message?.content || ""; lastErr = null; break
      } catch (err) { lastErr = err instanceof Error ? err : new Error(String(err)) }
    }
    if (lastErr) throw new Error(lastErr.message)

    let result: CopyResult | null = null
    let message = raw
    if (needStructured) {
      try {
        const p = JSON.parse(extractJson(raw)); result = parseResult(p)
        if (result) message = raw.replace(/\{[\s\S]*\}/, "").trim() || `已生成「${result.title}」`
      } catch { /* plain text is fine */ }
    }

    return NextResponse.json({ message, result } satisfies ChatResponse)
  } catch (error) {
    return NextResponse.json({ message: "", error: (error as Error).message } satisfies ChatResponse, { status: 500 })
  }
}
