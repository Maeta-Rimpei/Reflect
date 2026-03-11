/**
 * 週次/月次用にコメントを切り詰める。
 * 句の区切り（。、スペース）で切って不自然にならないようにし、
 * サロゲートペア（絵文字等）の途中で切らないようにする。
 *
 * @param str - 元の文字列
 * @param maxLen - 最大長（コード単位）
 * @returns 切り詰めた文字列
 */
export function truncateCommentForSummary(str: string, maxLen: number): string {
  const s = str ?? "";
  if (s.length <= maxLen) return s;
  let end = maxLen;
  if (end > 0 && s.charCodeAt(end - 1) >= 0xd800 && s.charCodeAt(end - 1) <= 0xdbff) end--;
  const truncated = s.slice(0, end);
  const lastPeriod = truncated.lastIndexOf("。");
  const lastComma = truncated.lastIndexOf("、");
  const lastSpace = truncated.lastIndexOf(" ");
  const boundary = Math.max(lastPeriod, lastComma, lastSpace);
  const minKeep = Math.floor(maxLen / 2);
  if (boundary >= minKeep) return s.slice(0, boundary + 1);
  return truncated;
}
