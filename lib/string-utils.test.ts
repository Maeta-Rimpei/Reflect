import { describe, it, expect } from "vitest";
import { truncateCommentForSummary } from "@/lib/string-utils";

describe("truncateCommentForSummary", () => {
  it("maxLen 以上なら切り詰める", () => {
    const s = "あ".repeat(100);
    expect(truncateCommentForSummary(s, 20).length).toBeLessThanOrEqual(20);
  });

  it("maxLen 以下ならそのまま", () => {
    expect(truncateCommentForSummary("短い", 80)).toBe("短い");
  });

  it("null/undefined 相当は空文字として扱う", () => {
    expect(truncateCommentForSummary(null as unknown as string, 10)).toBe("");
  });

  it("句点が手前にあれば句点で切る（boundary が minKeep 以上のとき）", () => {
    // minKeep = floor(30/2)=15。句点がそれより前だけだと生切りになる
    const s = "あ".repeat(20) + "。" + "あ".repeat(50);
    const out = truncateCommentForSummary(s, 30);
    expect(out.endsWith("。")).toBe(true);
    expect(out.length).toBe(21);
  });

  it("サロゲートペアの途中で切らない（絵文字）", () => {
    const s = "a".repeat(10) + "😀".repeat(5);
    const out = truncateCommentForSummary(s, 12);
    expect(out).not.toMatch(/\uD800$/);
  });
});
