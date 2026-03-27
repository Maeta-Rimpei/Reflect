import { describe, it, expect } from "vitest";
import { PROMPT_VERSIONS } from "@/lib/prompt-versions";

describe("PROMPT_VERSIONS", () => {
  it("分析タイプごとに v1 文字列が定義されている", () => {
    expect(PROMPT_VERSIONS.daily).toMatch(/^daily-v/);
    expect(PROMPT_VERSIONS.weekly).toMatch(/^weekly-v/);
    expect(PROMPT_VERSIONS.monthly).toMatch(/^monthly-v/);
    expect(PROMPT_VERSIONS.yearly).toMatch(/^yearly-v/);
    expect(PROMPT_VERSIONS.personality).toMatch(/^personality-v/);
    expect(PROMPT_VERSIONS.question).toMatch(/^question-v/);
  });
});
