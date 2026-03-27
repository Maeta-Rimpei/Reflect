import { describe, it, expect } from "vitest";
import {
  ruleBlock,
  wrapUserInput,
  worldClassAnalystIntro,
  buildJournalPrompt,
} from "@/lib/prompts";

describe("ruleBlock", () => {
  it("inputLabel が埋め込まれる", () => {
    const b = ruleBlock("テスト入力");
    expect(b).toContain("テスト入力");
    expect(b).toContain("重要なルール");
  });
});

describe("wrapUserInput", () => {
  it("マーカーで囲む", () => {
    expect(wrapUserInput("hello")).toContain("--- USER INPUT START ---");
    expect(wrapUserInput("hello")).toContain("--- USER INPUT END ---");
    expect(wrapUserInput("hello")).toContain("hello");
  });
});

describe("worldClassAnalystIntro", () => {
  it("rolePhrase を含む", () => {
    expect(worldClassAnalystIntro("分析する")).toContain("分析する");
    expect(worldClassAnalystIntro("分析する")).toContain("世界一");
  });
});

describe("buildJournalPrompt", () => {
  it("本文と JSON 指示が含まれる", () => {
    const p = buildJournalPrompt("今日の出来事");
    expect(p).toContain("今日の出来事");
    expect(p).toContain("primaryEmotion");
    expect(p).toContain("以下の7項目をJSONで出力する");
  });

  it("ユーザー入力がマーカーで囲まれる", () => {
    const p = buildJournalPrompt("body");
    expect(p).toContain(wrapUserInput("body"));
  });
});
