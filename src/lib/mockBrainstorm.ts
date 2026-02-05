import { summaryToMarkdown } from "@/lib/markdown";
import type { Summary } from "@/types/summary";

type Language = "en" | "zh";

interface MockQuestion {
  id: string;
  title: string;
  question: string;
  type: "single" | "multi" | "text";
  options?: Array<{ id: string; label: string; description?: string }>;
  allowOther?: boolean;
}

interface MockGroup {
  groupId: string;
  questions: MockQuestion[];
}

const GROUPS_ZH: MockGroup[] = [
  {
    groupId: "group_1",
    questions: [
      {
        id: "q_platform",
        title: "目标平台",
        question: "你希望游戏运行在哪些平台？",
        type: "single",
        options: [
          { id: "web", label: "网页端（推荐）" },
          { id: "mobile", label: "手机 App（iOS/Android）" },
          { id: "desktop", label: "桌面端（PC/Mac）" },
          { id: "console", label: "主机平台" },
        ],
      },
      {
        id: "q_innovation",
        title: "创新方向",
        question: "你想在哪些方面让这个贪吃蛇与众不同？（可多选）",
        type: "multi",
        allowOther: true,
        options: [
          { id: "mechanics", label: "玩法机制（如多条蛇、特殊道具、技能系统）" },
          { id: "visual", label: "视觉效果（如3D、粒子效果、独特美术风格）" },
          { id: "physics", label: "物理特性（如重力、碰撞、弹性）" },
          { id: "social", label: "多人对战/合作" },
          { id: "story", label: "剧情模式/关卡设计" },
          { id: "ai", label: "AI对手/智能行为" },
        ],
      },
      {
        id: "q_scope",
        title: "项目规模",
        question: "你期望的项目复杂度是？",
        type: "single",
        options: [
          { id: "small", label: "简单原型 - 快速实现核心创意" },
          { id: "medium", label: "中等规模 - 完整的游戏体验" },
          { id: "large", label: "复杂项目 - 丰富的功能和打磨" },
        ],
      },
    ],
  },
  {
    groupId: "group_2",
    questions: [
      {
        id: "q_mode",
        title: "多人模式",
        question: "你希望多人模式如何互动？（可多选）",
        type: "multi",
        allowOther: true,
        options: [
          { id: "coop", label: "合作模式（共同完成任务）" },
          { id: "pvp", label: "对战模式（互相竞争/攻击）" },
          { id: "async", label: "异步社交（排行榜/挑战赛）" },
          { id: "spectator", label: "直播/观众互动" },
        ],
      },
      {
        id: "q_controls",
        title: "交互方式",
        question: "你更喜欢哪种操作方式？",
        type: "single",
        options: [
          { id: "tap", label: "点击/滑动" },
          { id: "joystick", label: "虚拟摇杆" },
          { id: "tilt", label: "重力感应" },
          { id: "keyboard", label: "键盘（WASD/方向键）" },
        ],
      },
      {
        id: "q_pace",
        title: "节奏速度",
        question: "你希望整体节奏如何？",
        type: "single",
        options: [
          { id: "relaxed", label: "轻松偏慢" },
          { id: "balanced", label: "适中" },
          { id: "fast", label: "紧张快速" },
        ],
      },
    ],
  },
  {
    groupId: "group_3",
    questions: [
      {
        id: "q_art",
        title: "美术风格",
        question: "偏好的美术风格是？",
        type: "single",
        options: [
          { id: "minimal", label: "极简几何" },
          { id: "pixel", label: "像素复古" },
          { id: "handdrawn", label: "手绘插画" },
          { id: "sci-fi", label: "科幻霓虹" },
        ],
      },
      {
        id: "q_monetization",
        title: "商业模式",
        question: "你更倾向的商业模式？",
        type: "single",
        options: [
          { id: "free", label: "免费试玩 + 广告/内购" },
          { id: "premium", label: "付费买断" },
          { id: "subscription", label: "订阅制" },
        ],
      },
      {
        id: "q_goal",
        title: "核心目标",
        question: "你最想达成的核心目标是？",
        type: "text",
      },
    ],
  },
];

const GROUPS_EN: MockGroup[] = [
  {
    groupId: "group_1",
    questions: [
      {
        id: "q_platform",
        title: "Target Platform",
        question: "Which platform should the game run on?",
        type: "single",
        options: [
          { id: "web", label: "Web (recommended)" },
          { id: "mobile", label: "Mobile app (iOS/Android)" },
          { id: "desktop", label: "Desktop (PC/Mac)" },
          { id: "console", label: "Console" },
        ],
      },
      {
        id: "q_innovation",
        title: "Innovation",
        question: "Where do you want this Snake to stand out? (multi-select)",
        type: "multi",
        allowOther: true,
        options: [
          { id: "mechanics", label: "Gameplay mechanics (skills, items, multiple snakes)" },
          { id: "visual", label: "Visual style (3D, particles, unique art)" },
          { id: "physics", label: "Physics behavior (gravity, collisions, elasticity)" },
          { id: "social", label: "Multiplayer/Co-op" },
          { id: "story", label: "Story mode / levels" },
          { id: "ai", label: "AI opponents" },
        ],
      },
      {
        id: "q_scope",
        title: "Scope",
        question: "Expected project size?",
        type: "single",
        options: [
          { id: "small", label: "Quick prototype" },
          { id: "medium", label: "Full playable experience" },
          { id: "large", label: "Large, polished project" },
        ],
      },
    ],
  },
  {
    groupId: "group_2",
    questions: [
      {
        id: "q_mode",
        title: "Multiplayer",
        question: "How should multiplayer work? (multi-select)",
        type: "multi",
        allowOther: true,
        options: [
          { id: "coop", label: "Co-op missions" },
          { id: "pvp", label: "Versus battles" },
          { id: "async", label: "Async leaderboards" },
          { id: "spectator", label: "Live audience interaction" },
        ],
      },
      {
        id: "q_controls",
        title: "Controls",
        question: "Preferred control scheme?",
        type: "single",
        options: [
          { id: "tap", label: "Tap/swipe" },
          { id: "joystick", label: "Virtual joystick" },
          { id: "tilt", label: "Tilt" },
          { id: "keyboard", label: "Keyboard" },
        ],
      },
      {
        id: "q_pace",
        title: "Pacing",
        question: "Overall pacing?",
        type: "single",
        options: [
          { id: "relaxed", label: "Relaxed" },
          { id: "balanced", label: "Balanced" },
          { id: "fast", label: "Fast and intense" },
        ],
      },
    ],
  },
  {
    groupId: "group_3",
    questions: [
      {
        id: "q_art",
        title: "Visual Style",
        question: "Preferred art style?",
        type: "single",
        options: [
          { id: "minimal", label: "Minimal geometry" },
          { id: "pixel", label: "Pixel retro" },
          { id: "handdrawn", label: "Hand-drawn" },
          { id: "scifi", label: "Sci-fi neon" },
        ],
      },
      {
        id: "q_monetization",
        title: "Monetization",
        question: "Preferred monetization?",
        type: "single",
        options: [
          { id: "free", label: "Free + ads/IAP" },
          { id: "premium", label: "Premium" },
          { id: "subscription", label: "Subscription" },
        ],
      },
      {
        id: "q_goal",
        title: "Core Goal",
        question: "What is the single most important goal?",
        type: "text",
      },
    ],
  },
];

export function getMockGroups(language: Language) {
  return language === "zh" ? GROUPS_ZH : GROUPS_EN;
}

export function getMockSummary(language: Language) {
  if (language === "zh") {
    return {
      overview: "这是一个与众不同的贪吃蛇项目，强调独特玩法与多人互动体验。",
      features: [
        { name: "核心玩法", description: "多机制创新（道具、技能、多蛇协作）", priority: "high" },
        { name: "多人互动", description: "支持合作与对战，并提供排行榜", priority: "high" },
        { name: "美术表现", description: "采用高辨识度风格（像素或霓虹）", priority: "medium" },
      ],
      technicalPlan: "推荐使用 Web 技术栈，核心逻辑与渲染分离，支持移动端适配。",
      interactions: "以简单直观的交互为主，支持键盘/触控双模式。",
      risks: [
        { description: "多人同步复杂度高", mitigation: "先做异步排行榜版本", severity: "high" },
      ],
      openQuestions: [],
      generatedAt: new Date().toISOString(),
    };
  }

  return {
    overview: "A distinctive Snake project focusing on fresh mechanics and multiplayer interaction.",
    features: [
      { name: "Core Gameplay", description: "Novel mechanics with items/skills/multi-snake", priority: "high" },
      { name: "Multiplayer", description: "Co-op and versus with leaderboards", priority: "high" },
      { name: "Visual Style", description: "High-contrast visual identity", priority: "medium" },
    ],
    technicalPlan: "Web-first stack with modular game loop and renderer, mobile-friendly controls.",
    interactions: "Simple control scheme with keyboard + touch support.",
    risks: [
      { description: "Real-time multiplayer complexity", mitigation: "Start with async mode", severity: "high" },
    ],
    openQuestions: [],
    generatedAt: new Date().toISOString(),
  };
}

export function createMockBrainstormStream({
  input,
  language,
  historyCount,
}: {
  input: string | undefined;
  language: Language;
  historyCount: number;
}) {
  const encoder = new TextEncoder();
  const groups = getMockGroups(language);
  const groupIndex = Math.floor(historyCount / 3);
  const group = groups[groupIndex];
  const guide =
    language === "zh"
      ? `我很高兴帮助你完善“${input ?? "这个项目"}”。让我们从一些关键问题开始。`
      : `Happy to help refine "${input ?? "this project"}". Let's start with a few key questions.`;

  return new ReadableStream({
    start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      send({ type: "text", data: guide });
      if (group) {
        send({ type: "questions", data: group });
      } else {
        send({ type: "end", data: { ready: true } });
      }
      send({ type: "done", data: null });
      controller.close();
    },
  });
}

export function createMockSummaryResponse(language: Language) {
  const summary = getMockSummary(language) as Summary;
  return {
    summary,
    markdown: summaryToMarkdown(summary),
  };
}
