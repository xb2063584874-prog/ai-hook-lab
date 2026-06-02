import type { PlatformMode, ContentType, CopyStyle, ImageAnalysis } from "@/types"

// ==================== 平台 Prompt（按得物寄拍业务优化） ====================

const PLATFORM_PROMPTS: Record<PlatformMode, string> = {
  "dewu-jipai": `你是得物平台的寄拍文案专家。寄拍是品牌寄商品给博主，博主实拍穿搭发帖。
文案要点：
- 像真实用户发帖，不要硬广、不要太营销
- 强调上身效果、版型、出片感
- 用年轻人口吻（yyds、绝绝子、太顶了 适度使用）
- 突出"原相机直出""实物实拍"真实感
- 结尾自然收束，不要强Call to Action`,

  "dewu-daily": `你是得物日常分享博主。日常穿搭/球鞋分享。
文案要点：
- 自然随性，像和朋友聊天
- 强调日常场景（上学、逛街、约会）
- 实用搭配建议
- 语气轻松不刻意`,

  "dewu-shangdan": `你是得物品牌商单写手。付费合作推广内容。
文案要点：
- 专业有质感，体现品牌调性
- 多维度解析（设计、材质、穿着体验）
- 保留真实口吻但突出卖点
- 包含适合人群、种草理由
- 结构清晰，可深度阅读`,

  "xiaohongshu": `你是小红书种草博主。用户以年轻女性为主。
文案要点：
- "姐妹体"口吻，像闺蜜安利
- 情绪饱满但不虚假
- 善用"谁懂啊""救命"等开头
- 配图意识强（提到拍照角度、光线）
- 分段+emoji制造阅读节奏`,

  "douyin": `你是抖音短视频文案策划。
文案要点：
- 前3秒必须有强钩子
- 短句为主，适合口播节奏
- 制造悬念或冲突
- 更有冲突感，适合口播开头
- 结尾引导互动`,
}

// ==================== 文案生成 Prompt ====================

export function buildCopySystemPrompt(platform: PlatformMode, hasImage: boolean): string {
  return `${PLATFORM_PROMPTS[platform]}

${hasImage ? "用户提供了图片分析数据，请根据图片内容生成高度匹配的文案。" : "请根据用户描述的主题生成文案。"}

你必须严格输出如下 JSON（不要 markdown 包裹）：
{
  "title": "爆款标题，10-20字",
  "body": "完整正文，100-300字，可直接发布",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "coverText": "封面压字，5-10字",
  "shootingAdvice": "拍摄角度建议，15-30字",
  "score": 85,
  "reason": "爆款理由，15字内"
}

要求：
- title 有爆款特质
- body 完整可发布
- tags 精准含热门关键词
- coverText 简短有力
- score 60-100 之间
- 像真人写的，拒绝AI味`
}

export function buildCopyUserPrompt(
  userInput: string,
  platform: PlatformMode,
  contentType: ContentType,
  style: CopyStyle,
  imageAnalysis?: ImageAnalysis | null,
  manualDesc?: string
): string {
  let ctx = ""
  if (imageAnalysis) {
    ctx = `
【图片分析】
穿搭风格：${imageAnalysis.outfitStyle}
品牌元素：${imageAnalysis.brandElements}
颜色搭配：${imageAnalysis.colors}
版型特点：${imageAnalysis.fit}
拍摄场景：${imageAnalysis.scene}
拍摄角度：${imageAnalysis.angle}
封面吸睛点：${imageAnalysis.coverHook}
得物调性：${imageAnalysis.dewuTone}
商业价值：${imageAnalysis.commercialValue}
内容风险：${imageAnalysis.risk}`
  } else if (manualDesc) {
    ctx = `\n【用户手动描述】${manualDesc}`
  }

  const platformNames: Record<string, string> = {
    "dewu-jipai": "得物寄拍", "dewu-daily": "得物日常", "dewu-shangdan": "得物商单",
    "xiaohongshu": "小红书", "douyin": "抖音",
  }
  const contentTypeNames: Record<string, string> = {
    zhongcao: "种草笔记", daihuo: "带货文案", fengmian: "封面标题", zhibo: "直播引流", pinpai: "品牌商单",
  }
  const styleNames: Record<string, string> = {
    zhenshi: "真实分享", gaoji: "高级质感", wanggan: "网感俏皮", shangye: "商业带货", fancha: "反差冲突",
  }

  return `用户需求：${userInput}
平台：${platformNames[platform] || platform}
内容类型：${contentTypeNames[contentType] || contentType}
风格：${styleNames[style] || style}
${ctx}

请生成文案。`
}

// ==================== 视觉分析 Prompt（智谱） ====================

export function buildVisionPrompt(): string {
  return `你是一位顶级的时尚/电商视觉分析师。请仔细分析这张图片，输出如下 JSON：

{
  "outfitStyle": "穿搭风格（如：街头潮牌、日系简约、美式复古、韩系温柔、cleanfit、Y2K等）",
  "brandElements": "可识别的品牌元素/Logo/运动品牌特征",
  "colors": "主色调和配色逻辑",
  "fit": "版型特点（宽松/修身/oversized，剪裁特征）",
  "scene": "拍摄场景（室内对镜拍、户外街拍、工作室棚拍等）",
  "angle": "拍摄角度（平铺、对镜自拍、他拍、俯拍等）",
  "coverHook": "画面中最吸睛的视觉元素，适合做封面",
  "dewuTone": "得物平台调性匹配度（潮/运动/高街/休闲），以及适合得物哪个板块",
  "commercialValue": "适合接什么类型商单（球鞋/服饰/配饰/美妆/生活方式）",
  "risk": "可能的内容风险（过度修图/光线差/背景杂乱/不符合平台规范）"
}

每个字段 10-30 字，输出纯 JSON 不要 markdown。`
}

// ==================== 图片上下文（传给 DeepSeek） ====================

export function buildImageContext(analysis: ImageAnalysis): string {
  return `【智谱视觉分析】
穿搭：${analysis.outfitStyle} | 品牌：${analysis.brandElements}
配色：${analysis.colors} | 版型：${analysis.fit}
场景：${analysis.scene} | 角度：${analysis.angle}
封面吸睛点：${analysis.coverHook} | 得物调性：${analysis.dewuTone}
商业价值：${analysis.commercialValue} | 风险：${analysis.risk}`
}
