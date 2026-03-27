import { describe, it, expect } from "vitest";
import { getApiHeaders } from "@/lib/api-auth";

describe("getApiHeaders", () => {
  it("空オブジェクトを返す", async () => {
    const h = await getApiHeaders();
    expect(h).toEqual({});
  });
});
