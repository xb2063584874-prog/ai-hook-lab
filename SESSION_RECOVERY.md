# Session Recovery

> 断点恢复指南 — 创建于 2026-06-02

---

## 1. 当前项目状态

| 维度 | 状态 |
|------|------|
| 功能开发 | ✅ 核心功能完整可用 |
| 本地运行 | ✅ `npm run dev` → http://localhost:3000 |
| Vercel 部署 | ✅ 在线但国内无法正常访问 |
| CloudBase 部署 | ⏳ 方案已确认，待执行 |
| GitHub 同步 | ✅ main 分支已推送 |
| 文档 | ✅ PROJECT_README.md / PROJECT_STATUS.md / CLAUDE.md |

---

## 2. 已完成功能

### AI Hook Lab（主站 `/`）
- [x] **5 个平台模式**：得物寄拍 / 得物日常 / 得物商单 / 小红书 / 抖音
- [x] **5 种内容类型**：种草笔记 / 带货文案 / 封面标题 / 直播引流 / 品牌商单
- [x] **5 种文案风格**：真实分享 / 高级质感 / 网感俏皮 / 商业带货 / 反差冲突
- [x] **图片上传 + 分析**：前端 Canvas 压缩（1024px/0.7）→ 智谱 GLM-5V-Turbo → 10 维度结构化分析
- [x] **文案生成**：DeepSeek V4 Flash → 结构化输出（标题/正文/标签/封面文案/拍摄建议/评分）
- [x] **AI 对话**：自由聊天 + 自动检测结构化需求
- [x] **历史记录**：localStorage 最多 30 条，支持回溯/删除
- [x] **一键复制**：结构化文案卡片 → 复制全文到剪贴板
- [x] **图片分析缓存**：localStorage 缓存 1 小时
- [x] **中文字体栈**：PingFang SC / Noto Sans SC / Microsoft YaHei
- [x] **Glass morphism 主题**：Tailwind 自定义品牌色系 + 动画

### Gesture Particle Lab（`/particles`）🆕 2026-06-02
- [x] **全屏粒子系统**：Canvas 2D 渲染，~220 粒子，连接线，发光效果
- [x] **手势识别**：MediaPipe Hands 21 点 hand landmark 检测
- [x] **摄像头输入**：@mediapipe/camera_utils 帧捕获
- [x] **手势交互**：张开扩散 / 握拳聚拢 / 挥手波纹爆炸 / 双手双引力
- [x] **摄像头预览**：右上角小窗，可关闭/重开
- [x] **鼠标降级**：摄像头被拒自动切换，移动端触屏支持
- [x] **移动端优化**：粒子数自适应减少，触屏手势模拟
- [x] **Entry point**：标题 "Gesture Particle Lab"，按钮可跳回 `/`

---

## 3. 环境变量

| 变量名 | 用途 | 获取地址 |
|--------|------|----------|
| `DEEPSEEK_API_KEY` | DeepSeek 文案生成 + 对话 | https://platform.deepseek.com/api_keys |
| `ZHIPU_API_KEY` | 智谱图片视觉分析 | https://open.bigmodel.cn/usercenter/apikeys |

```bash
# .env.local 格式（已 gitignore）
DEEPSEEK_API_KEY=sk-xxxxxxxx
ZHIPU_API_KEY=xxxxxxxx.xxxxxxxx
```

---

## 4. GitHub 仓库

```
https://github.com/xb2063584874-prog/ai-hook-lab
```

**分支**: `main`
**最新 commit**: `56535eb` — "save project state before shutdown" (文档更新)
**后续 commit**: 手势粒子页面 + MediaPipe 集成

---

## 5. Vercel 地址

```
https://ai-hook-lab-orpin.vercel.app
```

**问题**：Vercel CDN 节点在海外，国内微信内置浏览器和普通浏览器速度极慢或直接打不开。需要国内部署方案解决。

---

## 6. CloudBase 部署情况

### 尚未实际部署，方案已分析完毕

| 方案 | 可行性 | 原因 |
|------|--------|------|
| **CloudRun 云托管** | ✅ 推荐 | 完整 Node.js 容器，API Routes 原样工作，和 Vercel 行为一致 |
| 静态托管 + SCF | ⚠️ 可行但需改造 | 需将 3 个 API Route 改写为云函数 |
| 纯静态托管 | ❌ 不可行 | Next.js `output: 'export'` 会丢弃所有 `/api/*` 路由，API Key 暴露风险 |

### 为什么纯静态托管不可行

项目有 3 个服务端 API Route：
- `/api/analyze-image` — 调用智谱 API（需要服务端保护 Key）
- `/api/generate-copy` — 调用 DeepSeek API（需要服务端保护 Key）
- `/api/chat` — 调用 DeepSeek API（需要服务端保护 Key）

这些 API Route 必须在 Node.js 运行时中执行。静态导出 (`next export`) 不会打包它们。

### CloudRun 部署步骤（待执行）

1. 修改 `next.config.js` → 添加 `output: 'standalone'`
2. 创建 `Dockerfile` → 多阶段构建，生产级 Node.js 镜像
3. 创建 `.dockerignore` → 排除 node_modules / .next / .git
4. 部署到 CloudBase CloudRun（容器服务）
5. 在 CloudBase 控制台配置 `DEEPSEEK_API_KEY` 和 `ZHIPU_API_KEY` 环境变量
6. 绑定自定义域名 + HTTPS

---

## 7. 下一步计划

| 优先级 | 任务 | 说明 |
|--------|------|------|
| 🔴 高 | CloudBase CloudRun 部署 | 解决国内微信/浏览器访问问题 |
| 🔴 高 | 创建 Dockerfile | CloudRun 容器部署必需 |
| 🟡 中 | 移动端响应式适配 | 当前三栏布局在手机上布局不佳 |
| 🟢 低 | 服务端图片分析缓存 | 减少智谱 API 重复调用成本 |
| 🟢 低 | 用户系统 | 跨设备同步历史记录（可选） |

---

## 8. 如何启动项目

```bash
# 1. 进入项目目录
cd C:\Users\Administrator\Claude\ai-hook-lab

# 2. 安装依赖（首次）
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 用编辑器打开 .env.local，填入你的 Key：
#   DEEPSEEK_API_KEY=sk-xxxxxxxx
#   ZHIPU_API_KEY=xxxxxxxx.xxxxxxxx

# 4. 启动开发服务器
npm run dev
# → 浏览器打开 http://localhost:3000

# 5. 构建生产版本
npm run build
npm run start
# → 浏览器打开 http://localhost:3000
```

---

## 9. 新增依赖（2026-06-02）

```json
{
  "@mediapipe/hands": "0.4.x",
  "@mediapipe/camera_utils": "0.3.x"
}
```

用于 `/particles` 页面的手势识别。MediaPipe 的 WASM 文件从 jsdelivr CDN 加载。

---

## 快速回顾（给 Claude 看的）

如果这是一个新会话，告诉 Claude：

> 我在开发 ai-hook-lab（`C:\Users\Administrator\Claude\ai-hook-lab`），一个 Next.js 14 穿搭文案生成工具。核心功能已完成，用过 DeepSeek + 智谱两个 API。新增了 `/particles` 手势粒子页面（MediaPipe Hands + Canvas 2D）。现在需要部署到腾讯云 CloudBase CloudRun（不能用静态托管，因为 API Routes 需要 Node.js 运行时）。先读 CLAUDE.md 和 PROJECT_README.md 了解详情，然后帮我继续 CloudBase 部署。
