import { describe, it, expect } from "vitest";
import {
  validatePasswordFormat,
  hashPassword,
  verifyPassword,
  PASSWORD_MIN_LENGTH,
} from "@/lib/password";

describe("validatePasswordFormat", () => {
  it("8文字未満は不可", () => {
    const r = validatePasswordFormat("Ab1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("8文字");
  });

  it("英字なしは不可", () => {
    const r = validatePasswordFormat("12345678");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("英字");
  });

  it("数字なしは不可", () => {
    const r = validatePasswordFormat("Abcdefgh");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("数字");
  });

  it("条件を満たせば ok", () => {
    expect(validatePasswordFormat("Abcdefg1").ok).toBe(true);
  });
});

describe("hashPassword / verifyPassword", () => {
  it("ハッシュ化して検証できる", async () => {
    const hash = await hashPassword("Secret123");
    expect(hash).toContain(":");
    expect(await verifyPassword("Secret123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("不正なハッシュ形式は false", async () => {
    expect(await verifyPassword("x", "nocolon")).toBe(false);
  });
});

describe("PASSWORD_MIN_LENGTH", () => {
  it("8", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });
});
