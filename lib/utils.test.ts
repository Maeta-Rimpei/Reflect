import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("複数の文字列を結合する", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("重複する Tailwind クラスは後のもので上書きされる", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("条件付きで undefined/false は無視される", () => {
    expect(cn("base", false && "hidden", undefined)).toBe("base");
  });

  it("配列やオブジェクトを渡せる", () => {
    expect(cn(["a", "b"])).toBe("a b");
    expect(cn({ "text-sm": true, "text-lg": false })).toBe("text-sm");
  });
});
