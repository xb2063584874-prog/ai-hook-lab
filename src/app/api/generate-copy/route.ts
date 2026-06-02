import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import type { GenerateCopyRequest, GenerateCopyResponse, CopyResult } from "@/types"
import { buildCopySystemPrompt, buildCopyUserPrompt } from "@/lib/prompt"

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

export async function POST(request: NextRequest) {
  try {
    const body: GenerateCopyRequest = await request.json().catch(() => null)
    if (!body?.userInput?.trim()) {
      return NextResponse.json({ result: null, error: "请输入文案需求" } satisfies GenerateCopyResponse, { status: 400 })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey || apiKey.startsWith("sk-your-")) {
      return NextResponse.json({ result: null, error: "DEEPSEEK_API_KEY 未配置" } satisfies GenerateCopyResponse, { status: 401 })
    }

    const client = new OpenAI({ baseURL: "https://api.deepseek.com", apiKey })
    const hasImage = !!body.imageAnalysis || !!body.manualImageDescription

    const systemPrompt = buildCopySystemPrompt(body.platform, hasImage)
    const userPrompt = buildCopyUserPrompt(
      body.userInput, body.platform, body.contentType, body.style,
      body.imageAnalysis, body.manualImageDescription
    )

    let raw = ""
    let lastErr: Error | null = null

    for (const model of ["deepseek-v4-flash", "deepseek-chat"]) {
      try {
        const completion = await client.chat.completions.create(
          {
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.85,
            max_tokens: 2048,
            response_format: { type: "json_object" },
          },
          { timeout: 30000, maxRetries: 1 }
        )
        raw = completion.choices[0]?.message?.content || ""
        lastErr = null
        break
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err))
      }
    }

    if (lastErr) {
      const msg = lastErr.message.includes("401") ? "DeepSeek Key 无效"
        : lastErr.message.includes("429") ? "请求太频繁，请稍候" : lastErr.message
      throw new Error(msg)
    }

    const parsed = JSON.parse(extractJson(raw))
    const result = parseResult(parsed)
    if (!result) throw new Error("AI 未生成有效文案")

    return NextResponse.json({ result } satisfies GenerateCopyResponse)
  } catch (error) {
    return NextResponse.json(
      { result: null, error: (error as Error).message } satisfies GenerateCopyResponse,
      { status: 500 }
    )
  }
}
