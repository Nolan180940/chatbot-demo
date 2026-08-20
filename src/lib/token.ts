/**
 * Token 估算工具
 *
 * 说明：BYOK 流式模式不返回 usage 对象，因此这里用启发式估算：
 *   - 中/日/韩字符：约 0.6 token / 字符
 *   - 英文及其他字符：约 1 token / 4 字符
 *   - 每条消息 +1 作为角色/格式开销
 * 该估算仅供学习参考，实际计费以模型服务商返回为准。
 */

const CJK_RE =
  /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u3400-\u4dbf\uf900-\ufaff]/g;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjkCount = (text.match(CJK_RE) ?? []).length;
  const otherCount = text.length - cjkCount;
  const tokens = cjkCount * 0.6 + otherCount / 4;
  return Math.max(1, Math.ceil(tokens));
}

export function estimateMessageTokens(role: string, content: string): number {
  return estimateTokens(content) + 1; // +1 角色标记
}

/** 人类可读的数字格式化 */
export function formatNumber(n: number): string {
  return n.toLocaleString("zh-CN");
}
