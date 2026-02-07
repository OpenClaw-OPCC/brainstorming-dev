# 会话恢复时 Turnstile 验证过期问题修复方案

## 问题描述

- **Issue #4**: 验证过期，最近会话无法继续
- **Issue #5**: 超时后，最近会话无法继续

## 问题根因

1. Session 对象中存储了 `turnstileToken?: string`
2. Turnstile token 有有效期限制（通常 5-10 分钟）
3. 会话超时后恢复时，系统使用存储的旧 token
4. 即使 Cloudflare 重新验证通过，点击"继续"仍然提示"验证已过期"

## 修复方案

### 位置
需要在恢复会话的页面组件中清除或更新 turnstile token

### 需要修改的文件
1. `src/app/session/[id]/page.tsx` (英文版本)
2. `src/app/[lang]/session/[id]/page.tsx` (多语言版本)

### 修复代码示例

```typescript
// 在恢复会话时，清除过期的 turnstile token
const handleResumeSession = async (sessionId: string) => {
  try {
    // 获取会话数据
    const session = await getSession(sessionId);

    // 修复：清除过期的 turnstile token
    if (session.turnstileToken) {
      session.turnstileToken = undefined;

      // 或者更新会话记录
      await updateSession(sessionId, { turnstileToken: undefined });
    }

    // 继续恢复会话的逻辑...
  } catch (error) {
    console.error('Failed to resume session:', error);
  }
};
```

### 替代方案：在验证检查时忽略过期 token

如果需要更激进的修复，可以在验证逻辑中检查 token 是否过期：

```typescript
// 在验证函数中添加
export async function verifyTurnstileToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  try {
    // 验证 token
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token
      })
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return false;
  }
}

// 在恢复会话时验证
const isValid = await verifyTurnstileToken(session.turnstileToken);
if (!isValid) {
  // 清除无效 token 并要求重新验证
  session.turnstileToken = undefined;
  await updateSession(sessionId, { turnstileToken: undefined });
}
```

## 测试步骤

1. 开始一个新的会话
2. 等待 5-10 分钟让 token 过期
3. 在首页点击"继续"按钮
4. 验证是否不再提示"验证已过期"
5. 确认会话可以正常恢复

## 注意事项

- 确保在清除 token 后，用户能够重新通过 Cloudflare 验证
- 考虑添加 token 刷新机制
- 测试多种超时场景（短时间、长时间）

## 相关文件

- `src/types/session.ts` - Session 类型定义
- `src/lib/sessionHistory.ts` - 会话历史管理
- `src/app/session/[id]/page.tsx` - 会话恢复页面
- `src/app/[lang]/session/[id]/page.tsx` - 多语言会话恢复页面
