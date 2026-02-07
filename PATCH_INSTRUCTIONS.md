# Session Resume Turnstile Fix - 实施指南

## 📝 问题描述

当用户超时后点击"继续"按钮，Turnstile 验证通过但仍提示"验证已过期"。

## 🔍 根本原因

在 `src/app/[lang]/session/[id]/page.tsx` 中：

```typescript
const handleVerified = async (token: string) => {
  setShowVerificationModal(false);
  await resumeAfterVerification(token);
};
```

问题：新的 token 没有更新到 session 中，导致后续请求仍然使用无效的验证。

## ✅ 修复方法

### 修改文件：`src/app/[lang]/session/[id]/page.tsx`

在 `handleVerified` 函数中添加更新 session 的逻辑：

```typescript
const handleVerified = async (token: string) => {
  setShowVerificationModal(false);

  // FIX: 更新 session 中的 turnstile token
  updateSession({
    ...session,
    turnstileToken: token,
    updatedAt: new Date().toISOString(),
  });

  await resumeAfterVerification(token);
};
```

## 📌 为什么这样修复？

1. **保存新 token：** 将验证通过的新 token 存入 session
2. **更新时间戳：** 记录更新时间，便于追踪
3. **保持一致性：** 后续请求使用最新的有效 token

## 🚀 部署步骤

1. 备份原文件
2. 应用修复
3. 测试场景：
   - 开始新会话
   - 等待 5-10 分钟
   - 点击"继续"
   - 验证是否能成功恢复

## 📝 Commit Message

```
fix: update turnstile token on session resume after verification

Fixes #4, #5

When user resumes a session after timeout and completes Turnstile
verification, the new token was not being saved to the session.
This caused subsequent API calls to fail with "verification expired"
error even though the user just successfully verified.

Changes:
- Update session.turnstileToken in handleVerified callback
- Add updatedAt timestamp for audit trail
