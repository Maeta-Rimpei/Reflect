import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/** 32 バイトの hex（64 文字） */
const VALID_KEY = "a".repeat(64);

describe("crypto", () => {
  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
    vi.resetModules();
  });

  it("encrypt → decrypt で元に戻る", async () => {
    process.env.ENCRYPTION_KEY = VALID_KEY;
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const plain = "hello 世界";
    const ct = encrypt(plain);
    expect(ct.split(":")).toHaveLength(3);
    expect(decrypt(ct)).toBe(plain);
  });

  it("isEncryptionConfigured は 64 文字 hex のとき true", async () => {
    process.env.ENCRYPTION_KEY = VALID_KEY;
    const { isEncryptionConfigured } = await import("@/lib/crypto");
    expect(isEncryptionConfigured()).toBe(true);
  });

  it("isEncryptionConfigured は未設定のとき false", async () => {
    delete process.env.ENCRYPTION_KEY;
    vi.resetModules();
    const { isEncryptionConfigured } = await import("@/lib/crypto");
    expect(isEncryptionConfigured()).toBe(false);
  });

  it("encrypt は鍵が無効なら throw", async () => {
    process.env.ENCRYPTION_KEY = "short";
    vi.resetModules();
    const { encrypt } = await import("@/lib/crypto");
    expect(() => encrypt("x")).toThrow(/ENCRYPTION_KEY/);
  });

  it("decrypt はコロン区切りでない文字列をそのまま返す（移行用）", async () => {
    process.env.ENCRYPTION_KEY = VALID_KEY;
    const { decrypt } = await import("@/lib/crypto");
    expect(decrypt("plain-no-colons")).toBe("plain-no-colons");
  });
});
