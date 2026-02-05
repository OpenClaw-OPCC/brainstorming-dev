# CLAUDE.md - Brainstorming Dev 项目指南

## 项目概述

**Brainstorming** 是一个 AI 驱动的头脑风暴工具，帮助用户将模糊的想法转化为完整的需求文档。通过 Anthropic Claude API 进行交互式问答，引导用户梳理思路，最终生成结构化的需求总结。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16.1.6 (App Router) |
| 语言 | TypeScript 5.x |
| UI | React 19.2.3 |
| 样式 | Tailwind CSS 4.x + CSS Variables |
| AI | Anthropic Claude SDK (@anthropic-ai/sdk ^0.60.0) |
| Markdown | react-markdown + remark-gfm |
| 包管理器 | pnpm (必须使用) |
| 测试 | Vitest 2.x |

## 常用命令

```bash
pnpm dev          # 启动开发服务器 (注意: 请让用户自己启动)
pnpm build        # 构建生产版本
pnpm lint         # 代码检查
pnpm test         # 运行单元测试
pnpm test:watch   # 监听模式运行测试
pnpm test:e2e     # 运行 E2E 测试
```

## 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── [lang]/             # 国际化动态路由 (en/zh)
│   │   ├── page.tsx        # 首页
│   │   ├── history/        # 历史记录页面
│   │   ├── session/[id]/   # 会话页面
│   │   └── summary/[id]/   # 总结页面
│   ├── api/                # API 路由
│   │   ├── brainstorm/     # 头脑风暴 SSE 流式 API
│   │   └── summary/        # 生成总结 API
│   ├── layout.tsx          # 根布局
│   └── globals.css         # 全局样式 (CSS Variables 主题)
├── components/             # React 组件
│   ├── layout/             # 布局组件 (Header, Footer)
│   ├── home/               # 首页组件
│   ├── question/           # 问题组件
│   ├── summary/            # 总结组件
│   └── history/            # 历史组件
├── hooks/                  # 自定义 Hooks
│   ├── useI18n.ts          # 国际化
│   ├── useTheme.ts         # 主题切换
│   ├── useSessionEngine.ts # 会话引擎
│   └── useLocalStorage.ts  # 本地存储
├── lib/                    # 工具库
│   ├── anthropic.ts        # Anthropic 客户端
│   ├── prompts.ts          # AI Prompt 模板
│   ├── sse.ts              # SSE 流处理
│   ├── storage.ts          # LocalStorage 存储
│   └── questions.ts        # 问题处理逻辑
├── types/                  # TypeScript 类型定义
├── i18n/                   # 国际化资源 (en.json, zh.json)
└── e2e/                    # E2E 测试
```

## 路由结构

| 路由 | 说明 |
|------|------|
| `/` 或 `/en` | 英文首页 |
| `/zh` | 中文首页 |
| `/[lang]/session/[id]` | 会话页面 |
| `/[lang]/summary/[id]` | 总结页面 |
| `/[lang]/history` | 历史列表 |

## 环境变量

```bash
ANTHROPIC_BASE_URL=http://127.0.0.1:8045
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_MODEL=claude-sonnet-4-20250514
MOCK_BRAINSTORM=1           # 启用 Mock 模式 (开发调试用)
E2E_BASE_URL=http://127.0.0.1:3000
```

## 开发规范

### 必须遵守
- **包管理器**: 必须使用 `pnpm`，不使用 npm
- **测试**: 保持单元测试通过 (`pnpm test`)
- **存储**: 仅使用 localStorage，无数据库
- **AI 响应**: 使用 SSE 流式传输

### 设计规范
- UI 必须匹配 Claude Code / claude.ai 风格
- 遵循 Claude 视觉语言 (温暖中性色、精准排版)
- 亮色/暗色主题必须同时支持
- 保持界面简洁专注，避免杂乱 UI

### 国际化
- 基于路由: 英文 `/`，中文 `/zh`
- 语言切换仅更新 UI 语言
- AI 语言固定为会话创建时的语言

## 核心数据类型

### Session (会话)
```typescript
interface Session {
  id: string;
  title: string;
  initialInput: string;
  status: "active" | "completed";
  language: "en" | "zh";
  template?: TemplateType;
  questionGroups: QuestionGroup[];
  answers: Answer[];
  summary?: Summary;
}
```

### Question (问题)
```typescript
type QuestionType = "single" | "multi" | "text" | "slider" | "yesno";

interface Question {
  id: string;
  type: QuestionType;
  title: string;
  question: string;
  options?: Option[];
  allowOther?: boolean;
}
```

## QA 清单 (提交前检查)

- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过
- [ ] 亮色/暗色主题显示正确
- [ ] 完整流程: 输入 → 问题 → 总结 → Markdown 导出

## 语言设置

请使用中文与我对话。代码注释可以根据需要使用英文或中文。
