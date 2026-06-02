# CLAUDE.md

## Project: ai-hook-lab

AI 爆款文案工作台 — 支持小红书/得物/抖音等平台的穿搭图片分析和文案生成。

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.5
- **Styling**: Tailwind CSS 3.4
- **AI**: DeepSeek (text) + 智谱 GLM-5V-Turbo (vision)
- **SDK**: openai ^4.67 (compatible with both DeepSeek and Zhipu)

## Commands

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Production build
npm run start    # Production server
npm run lint     # Run linter
```

## Environment Variables

```
DEEPSEEK_API_KEY=   # DeepSeek platform: https://platform.deepseek.com/api_keys
ZHIPU_API_KEY=      # Zhipu platform: https://open.bigmodel.cn/usercenter/apikeys
```

## Architecture

```
Browser (React SPA)
  ├── page.tsx          (all state management, localStorage history)
  ├── Components (7)    (Header, LeftPanel, RightPanel, PlatformModeBar, ChatInput, ChatMessage, ResultCard)
  └── API calls
        ├── POST /api/analyze-image   → Zhipu GLM-5V-Turbo
        ├── POST /api/generate-copy   → DeepSeek (structured JSON output)
        └── POST /api/chat            → DeepSeek (chat, auto-detect structured)
```

## Key Design Decisions

1. **Single `openai` SDK for both APIs** — DeepSeek and Zhipu both use OpenAI-compatible endpoints; only `baseURL` differs.
2. **Frontend image compression** — Canvas resizes to 1024px/0.7 quality before sending to vision API, reducing token costs ~80%.
3. **API key protection** — All AI calls go through Next.js API Routes; keys never reach the browser.
4. **localStorage for everything** — History (30 items max) and image analysis cache (1-hour TTL) are client-side only.
5. **Fallback model chains** — Both `/analyze-image` and `/generate-copy` try faster/cheaper models first, then fall back.

## File Map

| Path | Role |
|------|------|
| `src/app/page.tsx` | Main page: all state, API orchestration, localStorage |
| `src/app/layout.tsx` | Root layout, metadata |
| `src/types/index.ts` | All TypeScript types + platform/content/style configs |
| `src/lib/prompt.ts` | System prompts for 5 platforms + vision analysis prompt |
| `src/components/LeftPanel.tsx` | Sidebar: new chat, materials, manual desc, history |
| `src/components/RightPanel.tsx` | Sidebar: image upload, compression, analysis display |
| `src/components/ResultCard.tsx` | Structured copy card with copy-to-clipboard |
| `src/app/api/` | 3 API routes (server-side only) |

## Deployment

- **Vercel**: https://ai-hook-lab-orpin.vercel.app (blocked in China)
- **GitHub**: https://github.com/xb2063584874-prog/ai-hook-lab
- **Target**: CloudBase CloudRun (for domestic China access via WeChat/browser)

## Notes

- `npm run build` takes ~60s due to Tailwind + TypeScript compilation
- API routes cannot be statically exported — CloudBase static hosting won't work
- Image analysis on Zhipu takes 3-8 seconds depending on model load
- `tailwind.config.ts` has custom animations (fade-in, slide-up, scale-in, shimmer)
