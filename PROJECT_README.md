# AI Hook Lab — 爆款文案工作台

> 小红书 · 得物 · 抖音 AI 穿搭文案生成器 | 图片分析 + 智能写作

---

## 1. 项目功能

### 核心能力

| 功能 | 说明 |
|------|------|
| 🖼️ **穿搭图片智能分析** | 上传图片 → 智谱 GLM-5V-Turbo 自动分析 10 个维度（风格、品牌、配色、版型、场景、角度、封面点、得物调性、商单价值、风险） |
| ✍️ **多平台文案生成** | 基于图片分析 + 用户需求 → DeepSeek 生成结构化的平台文案（标题、正文、标签、封面文案、拍摄建议、爆款评分） |
| 💬 **AI 对话** | 自由聊天模式，可引用图片上下文，AI 自动判断是否需要结构化输出 |
| 📋 **历史记录** | localStorage 自动保存最近 30 条对话，支持回溯、删除、清空 |
| 📎 **一键复制** | 生成的文案支持一键复制全文到剪贴板 |
| 🗜️ **前端图片压缩** | 上传时自动压缩到 1024px 宽 / 0.7 质量，减少 API 调用延迟 |

### 支持平台

| 平台 | 模式 | 文案风格 |
|------|------|----------|
| 📸 得物寄拍 | 寄拍模特穿搭文案 | 真实用户口吻，强调上身效果 / 原相机实拍 |
| 👟 得物日常 | 日常球鞋 / 潮牌分享 | 自然随性，实用搭配建议 |
| 💼 得物商单 | 品牌商单专业文案 | 专业质感，多维度解析产品卖点 |
| 📕 小红书 | 种草笔记深度文案 | "姐妹体"，情绪饱满，分段 + emoji |
| 🎵 抖音 | 短视频口播 / 带货文案 | 前 3 秒强钩子，短句节奏，引导互动 |

### 内容类型 & 风格

- **内容类型**：种草笔记 / 带货文案 / 封面标题 / 直播引流 / 品牌商单
- **文案风格**：真实分享 / 高级质感 / 网感俏皮 / 商业带货 / 反差冲突

---

## 2. 页面结构

```
┌─────────────────────────────────────────────────┐
│  Header                                          │
│  [Hook Lab  AI 文案工作台]          [🟢 DeepSeek] │
├──────────┬───────────────────────┬───────────────┤
│ LeftPanel│    Center (Chat)      │  RightPanel   │
│          │                       │               │
│ 新建对话  │  [平台模式切换栏]       │  上传图片区域   │
│          │  [内容类型/风格选择]     │  (拖拽/点击)   │
│ 素材库    │                       │               │
│ 图片预览  │  聊天消息列表           │  图片预览      │
│ 手动描述  │  · 用户消息            │  分析进度      │
│          │  · AI 回复             │  分析结果卡片   │
│ 历史记录  │  · 结构化文案卡片       │               │
│ · 条目1  │                       │               │
│ · 条目2  │  输入框                │               │
│ · 条目3  │  [引用图片] [发送]      │               │
└──────────┴───────────────────────┴───────────────┘
│         ResultCard (fixed overlay, bottom-right) │
│         标题 / 正文 / 标签 / 封面 / 拍摄建议         │
└─────────────────────────────────────────────────┘
```

### 组件清单（7 个）

| 组件 | 文件 | 职责 |
|------|------|------|
| `Header` | `src/components/Header.tsx` | 顶栏：Logo + 在线状态指示 |
| `LeftPanel` | `src/components/LeftPanel.tsx` | 左侧栏：新建对话、素材库、图片描述、历史记录 |
| `PlatformModeBar` | `src/components/PlatformModeBar.tsx` | 平台模式切换按钮组 |
| `ChatInput` | `src/components/ChatInput.tsx` | 聊天输入框：引用图片开关 + 自适应 textarea |
| `ChatMessage` | `src/components/ChatMessage.tsx` | 聊天气泡：用户（紫色）/ AI（白色）+ 时间戳 |
| `ResultCard` | `src/components/ResultCard.tsx` | 结构化文案卡片：标题、正文、标签、评分、一键复制 |
| `RightPanel` | `src/components/RightPanel.tsx` | 右侧栏：图片拖拽上传、压缩、分析状态、结果展示 |

---

## 3. API 结构

### 3.1 `POST /api/analyze-image` — 图片分析

```
文件: src/app/api/analyze-image/route.ts
模型: 智谱 GLM-5V-Turbo → GLM-4V-Flash → GLM-4V（降级）
```

**请求**
```json
{
  "imageBase64": "<base64 string>",
  "imageMimeType": "image/jpeg"
}
```

**响应**
```json
{
  "analysis": {
    "outfitStyle": "穿搭风格",
    "brandElements": "品牌元素",
    "colors": "颜色搭配",
    "fit": "版型特点",
    "scene": "拍摄场景",
    "angle": "拍摄角度",
    "coverHook": "封面吸睛点",
    "dewuTone": "得物调性",
    "commercialValue": "商单价值",
    "risk": "风险点"
  }
}
```

**Key**: `ZHIPU_API_KEY` · Base URL: `https://open.bigmodel.cn/api/paas/v4/`

---

### 3.2 `POST /api/generate-copy` — 文案生成

```
文件: src/app/api/generate-copy/route.ts
模型: DeepSeek V4 Flash → DeepSeek Chat（降级）
```

**请求**
```json
{
  "userInput": "写一篇得物穿搭笔记",
  "platform": "dewu-jipai",
  "contentType": "zhongcao",
  "style": "zhenshi",
  "imageAnalysis": { ... },
  "manualImageDescription": "可选手动描述"
}
```

**响应**
```json
{
  "result": {
    "title": "爆款标题",
    "body": "完整正文",
    "tags": ["标签1", "标签2"],
    "coverText": "封面压字",
    "shootingAdvice": "拍摄建议",
    "score": 85,
    "reason": "爆款理由"
  }
}
```

**Key**: `DEEPSEEK_API_KEY` · Base URL: `https://api.deepseek.com`

---

### 3.3 `POST /api/chat` — AI 对话

```
文件: src/app/api/chat/route.ts
模型: DeepSeek V4 Flash → DeepSeek Chat（降级）
```

**请求**
```json
{
  "messages": [
    { "role": "user", "content": "帮我看看这套穿搭" }
  ],
  "platform": "dewu-jipai",
  "imageContext": "【智谱视觉分析】\n穿搭：街头潮牌..."
}
```

**响应**
```json
{
  "message": "AI 回复文本",
  "result": { ... }
}
```

> 自动检测用户意图：包含"生成/文案/标题/种草/穿搭/商单/寄拍/写"等关键词时，自动输出结构化 JSON。

---

### 数据流

```
用户上传图片
    │
    ▼
RightPanel (前端压缩到 1024px)
    │
    ▼
fetch /api/analyze-image ──► 智谱 GLM-5V-Turbo
    │                              │
    ▼                              ▼
analysis state             10 维度分析结果
    │
    ▼
用户输入文案需求
    │
    ▼
fetch /api/generate-copy ──► DeepSeek API
(附带 analysis 数据)              │
    │                              ▼
    ▼                         结构化文案 JSON
ResultCard 展示
```

---

## 4. 环境变量

| 变量名 | 用途 | 获取地址 |
|--------|------|----------|
| `DEEPSEEK_API_KEY` | DeepSeek 文案生成 & 对话 | https://platform.deepseek.com/api_keys |
| `ZHIPU_API_KEY` | 智谱图片视觉分析 | https://open.bigmodel.cn/usercenter/apikeys |

### 本地配置

```bash
# .env.local（已 gitignore）
DEEPSEEK_API_KEY=sk-xxxxxxxx
ZHIPU_API_KEY=xxxxxxxx.xxxxxxxx
```

`.env.example` 作为模板提交，不包含实际 Key 值。

---

## 5. 部署方式

### 5.1 当前部署

| 平台 | 地址 | 状态 |
|------|------|------|
| **GitHub** | https://github.com/xb2063584874-prog/ai-hook-lab | ✅ 已推送 |
| **Vercel** | https://ai-hook-lab-orpin.vercel.app | ✅ 已部署 |

### 5.2 Vercel 问题

Vercel 的 CDN 节点在海外，国内微信内置浏览器和普通浏览器**无法打开或加载极慢**。

### 5.3 CloudBase 部署（计划中）

**目标**：部署到腾讯云 CloudBase，让国内微信和浏览器可以正常访问。

**推荐方案：CloudRun（云托管）**

> ⚠️ 本项目使用 Next.js API Routes（服务端代码，调用 DeepSeek / 智谱 API），**不能使用静态托管**。静态导出会丢弃所有 `/api/*` 路由。

| 方案 | 可行性 | 说明 |
|------|--------|------|
| CloudRun 云托管 | ✅ 推荐 | 完整 Node.js 运行时，API Routes 原样工作 |
| 静态托管 + SCF | ⚠️ 可行 | 需将 3 个 API Route 改写为云函数 |
| 纯静态托管 | ❌ 不可行 | API 路由无法工作，Key 暴露风险 |

**待添加的部署文件**：
- `Dockerfile` — 生产级 Next.js 容器镜像
- `.dockerignore` — 减小构建上下文
- `next.config.js` — 添加 `output: 'standalone'`

---

## 6. 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | ^14.2.0 |
| UI | React | ^18.3.0 |
| 样式 | Tailwind CSS | ^3.4.0 |
| 语言 | TypeScript | ^5.5.0 |
| AI SDK | openai (兼容 DeepSeek & 智谱) | ^4.67.0 |
| 图片分析 | 智谱 GLM-5V-Turbo | — |
| 文案生成 | DeepSeek V4 Flash / Chat | — |

---

## 7. 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 DEEPSEEK_API_KEY 和 ZHIPU_API_KEY

# 启动开发服务器
npm run dev
# → http://localhost:3000

# 构建生产版本
npm run build

# 启动生产服务器
npm run start
```

---

## 8. 项目结构

```
ai-hook-lab/
├── .env.example              # 环境变量模板
├── .env.local                # 本地环境变量（gitignore）
├── .gitignore
├── next.config.js            # Next.js 配置
├── package.json
├── postcss.config.js
├── tailwind.config.ts        # Tailwind 主题（品牌色、玻璃拟态、动画）
├── tsconfig.json             # TypeScript 配置（@/ 别名）
│
└── src/
    ├── app/
    │   ├── globals.css       # 全局样式（玻璃拟态、聊天气泡、小红书卡片、滚动条）
    │   ├── layout.tsx        # 根布局（html lang="zh-CN"）
    │   ├── page.tsx          # 主页面（状态管理、API 调用、历史记录逻辑）
    │   └── api/
    │       ├── analyze-image/route.ts   # 智谱图片分析 API
    │       ├── chat/route.ts            # DeepSeek 对话 API
    │       └── generate-copy/route.ts   # DeepSeek 文案生成 API
    │
    ├── components/
    │   ├── Header.tsx        # 顶栏
    │   ├── LeftPanel.tsx     # 左侧栏（素材库 + 历史记录）
    │   ├── RightPanel.tsx    # 右侧栏（图片上传 + 分析结果）
    │   ├── PlatformModeBar.tsx  # 平台模式切换
    │   ├── ChatInput.tsx     # 聊天输入框
    │   ├── ChatMessage.tsx   # 聊天气泡
    │   └── ResultCard.tsx    # 结构化文案卡片
    │
    ├── lib/
    │   └── prompt.ts         # Prompt 模板（5 个平台 + 视觉分析）
    │
    └── types/
        └── index.ts          # TypeScript 类型定义
```

---

## 9. 当前待办事项

- [ ] **CloudBase 部署** — 部署到腾讯云 CloudBase CloudRun，解决国内微信/浏览器无法访问的问题
- [ ] **Dockerfile** — 创建生产级 Next.js 容器镜像配置
- [ ] **移动端适配** — 当前三栏布局在手机屏幕上需要优化
- [ ] **图片分析缓存优化** — 当前使用 localStorage 缓存 1 小时，可考虑服务端缓存
- [ ] **错误上报** — 添加前端错误监控（如 Bad.js 或自建）
- [ ] **用户系统** — 支持登录以跨设备同步历史记录（可选）
- [ ] **更多平台** — 考虑添加淘宝、拼多多、朋友圈等平台模板

---

## 10. 许可证

仅用于学习和个人使用。
