# Roast Prof (暴躁教授看B站) 🔥

> 基于「林亦LYi」频道开源项目 "mad-professor" (暴躁教授论文陪读) 的全栈重构与创意二次开发版本。

## 🎯 项目简介

原项目旨在作为学术论文的 AI 陪读伴侣，能够解析极长文本（PDF）并利用 RAG 技术和不同的角色人设进行伴读与讲解。
本项目对该场景进行了**创意模块重组**与**工程化重构**：

1. **知识源降维重组**：将枯燥的“学术论文”替换为了“B站视频字幕内容”。只需粘贴视频链接，暴躁教授就会立刻阅读视频内容，化身弹幕评论员，用原神“可莉/雷电将军”的性格跟你互怼讨论视频观点。
2. **全栈现代化重构与一键部署**：原桌面应用存在大量环境依赖（需要 CUDA, FAISS-GPU, MinerU, PyQt6），难以向非技术用户分发。本项目运用了现代 Web Stack，将重型本地推理平替，变为云端无服务器架构。

## 🛠 技术栈

- **前端**：React 19, TypeScript, Tailwind CSS v4, Vite
- **后端/部署**：Cloudflare Workers, Hono
- **LLM/AI**：DeepSeek API (原逻辑接入), 纯净版轻量级 RAG
- **工程化**：PNPM, Biome (Linting & Formatting)

## 📦 本地运行

安装依赖并启动全栈开发环境（前端 Vite + 后端 Wrangler Worker）：

```bash
pnpm install
pnpm dev
```

运行工程严格检查（类型推断与代码格式化）：

```bash
pnpm check
```

## 🗺 开发计划 (WIP)

- [ ] Web UI 面板架构
- [ ] Bilibili 字幕流式抓取与解析模块
- [ ] 基于 Serverless 的 RAG 构建与记忆缓存
- [ ] 人设 Prompt 工程与情绪路由 (复用原项目逻辑)
- [ ] TTS 实时音频输出集成
