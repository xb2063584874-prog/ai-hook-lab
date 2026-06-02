import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import type { AnalyzeImageRequest, AnalyzeImageResponse, ImageAnalysis } from "@/types"

// ==================== JSON 提取 ====================

function extractJson(text: string): string {
  const md = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (md) return md[1].trim()
  const b = text.indexOf("{"), e = text.lastIndexOf("}")
  if (b !== -1 && e !== -1 && e > b) return text.slice(b, e + 1)
  return text
}

function parseAnalysis(data: unknown): ImageAnalysis | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  const s = (key: string) => {
    // Also check Chinese keys as fallback
    const v = d[key] ?? d[fieldNameMap[key] ?? ""] ?? ""
    return String(v).trim().slice(0, 80)
  }
  return {
    outfitStyle: s("outfitStyle"),
    brandElements: s("brandElements"),
    colors: s("colors"),
    fit: s("fit"),
    scene: s("scene"),
    angle: s("angle"),
    coverHook: s("coverHook"),
    dewuTone: s("dewuTone"),
    commercialValue: s("commercialValue"),
    risk: s("risk"),
  }
}

// Chinese key fallback mapping
const fieldNameMap: Record<string, string> = {
  outfitStyle: "穿搭风格",
  brandElements: "品牌元素",
  colors: "颜色搭配",
  fit: "版型特点",
  scene: "场景",
  angle: "拍摄角度",
  coverHook: "封面吸睛点",
  dewuTone: "得物调性",
  commercialValue: "商单价值",
  risk: "风险点",
}

// ==================== Vision Prompt ====================

function buildVisionPrompt(): string {
  return `你是一位顶级的时尚/电商视觉分析师。请仔细分析这张图片，输出如下 JSON（10 个字段，每个 10-30 字）：

{
  "outfitStyle": "穿搭风格（街头潮牌/日系简约/美式复古/韩系温柔/cleanfit/Y2K/机能风等）",
  "brandElements": "品牌元素/Logo/运动品牌特征",
  "colors": "颜色搭配（主色调+辅助色+配色逻辑）",
  "fit": "版型特点（宽松/修身/oversized，剪裁特征）",
  "scene": "拍摄场景（室内对镜拍/户外街拍/工作室棚拍/咖啡店/校园等）",
  "angle": "拍摄角度（平铺/对镜自拍/他拍/俯拍/45度角等）",
  "coverHook": "封面吸睛点（画面中最抓眼球的元素，适合做封面）",
  "dewuTone": "得物调性（潮/运动/高街/休闲/机能，适合得物哪个板块）",
  "commercialValue": "商单价值（适合接什么类型商单：球鞋/服饰/配饰/美妆/生活方式）",
  "risk": "风险点（过度修图/光线差/背景杂乱/品牌logo不清晰/不符合平台规范）"
}

要求：
- 每个字段 10-30 字中文，要具体、专业、可用
- 输出纯 JSON，不要 markdown 包裹
- 如果某个字段无法判断，写"暂未识别"而不是留空`
}

// ==================== API Route ====================

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeImageRequest = await request.json().catch(() => null)
    if (!body?.imageBase64) {
      return NextResponse.json(
        { analysis: null, error: "未提供图片" } satisfies AnalyzeImageResponse,
        { status: 400 }
      )
    }

    const { imageBase64, imageMimeType } = body
    const imageUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:${imageMimeType || "image/jpeg"};base64,${imageBase64}`

    // ---- 检查 Key ----
    const zhipuKey = process.env.ZHIPU_API_KEY
    if (!zhipuKey || zhipuKey.trim() === "") {
      return NextResponse.json({
        analysis: null,
        error: "ZHIPU_API_KEY 未配置。请在 .env.local 中设置。获取地址：https://open.bigmodel.cn/usercenter/apikeys",
      } satisfies AnalyzeImageResponse)
    }

    const client = new OpenAI({
      baseURL: "https://open.bigmodel.cn/api/paas/v4/",
      apiKey: zhipuKey,
    })

    // GLM-5V-Turbo 优先，失败则降级
    const models = ["glm-5v-turbo", "glm-4v-flash", "glm-4v"]
    let lastErr = ""

    for (const model of models) {
      try {
        console.log(`[Zhipu] Trying model: ${model}`)
        const completion = await client.chat.completions.create(
          {
            model,
            messages: [
              { role: "system", content: buildVisionPrompt() },
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: imageUrl } },
                  { type: "text", text: "请分析这张穿搭/产品图片，输出 10 个维度的结构化分析。" },
                ],
              },
            ],
            temperature: 0.3,
            max_tokens: 1000,
          },
          { timeout: 30000, maxRetries: 1 }
        )

        const raw = completion.choices[0]?.message?.content || ""
        console.log(`[Zhipu ${model}] raw:`, raw.slice(0, 250))

        const jsonText = extractJson(raw)
        const parsed = JSON.parse(jsonText)
        const analysis = parseAnalysis(parsed)

        if (analysis) {
          console.log(`[Zhipu] ✅ Success with ${model}`)
          return NextResponse.json({ analysis } satisfies AnalyzeImageResponse)
        }
        lastErr = `模型 ${model} 返回格式异常`
      } catch (err) {
        const msg = (err as Error).message
        console.warn(`[Zhipu] ${model} failed:`, msg.slice(0, 100))

        if (msg.includes("401") || msg.includes("auth") || msg.includes("key")) {
          return NextResponse.json({
            analysis: null,
            error: "智谱 API Key 无效，请检查 .env.local 中的 ZHIPU_API_KEY 是否正确。",
          } satisfies AnalyzeImageResponse)
        }
        // Model doesn't exist or rate limited — try next
        lastErr = msg
      }
    }

    return NextResponse.json({
      analysis: null,
      error: `智谱分析失败（已尝试 ${models.join(", ")}）：${lastErr.slice(0, 120)}`,
    } satisfies AnalyzeImageResponse)
  } catch (error) {
    const msg = (error as Error).message
    console.error("[Zhipu] Fatal:", msg)
    return NextResponse.json(
      { analysis: null, error: `分析失败：${msg}` } satisfies AnalyzeImageResponse,
      { status: 500 }
    )
  }
}
