import { describe, it, expect } from "vitest";
import {
  isGoogleProviderDisabledError,
  GOOGLE_PROVIDER_DISABLED_MESSAGE,
} from "@/lib/auth-errors";

describe("isGoogleProviderDisabledError", () => {
  it("メッセージに not enabled が含まれると true", () => {
    expect(
      isGoogleProviderDisabledError(
        new Error("Sign in with Google is not enabled"),
      ),
    ).toBe(true);
  });

  it("JSON 文字列の msg を解釈する", () => {
    const raw = JSON.stringify({
      msg: "Unsupported provider: provider is not enabled",
    });
    expect(isGoogleProviderDisabledError(raw)).toBe(true);
  });

  it("urlParams の error_description を見る", () => {
    expect(
      isGoogleProviderDisabledError("ok", {
        error_description: "validation_failed provider not enabled",
      }),
    ).toBe(true);
  });

  it("無関係なエラーは false", () => {
    expect(isGoogleProviderDisabledError(new Error("network error"))).toBe(
      false,
    );
  });
});

describe("GOOGLE_PROVIDER_DISABLED_MESSAGE", () => {
  it("非空の案内文", () => {
    expect(GOOGLE_PROVIDER_DISABLED_MESSAGE.length).toBeGreaterThan(10);
    expect(GOOGLE_PROVIDER_DISABLED_MESSAGE).toContain("Google");
  });
});
