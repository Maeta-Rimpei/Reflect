import { describe, it, expect, vi } from "vitest";
import { fetchJournalInitialData } from "./fetch-journal-initial-data";

describe("fetchJournalInitialData", () => {
  it("初期データを取得する", async () => {
    const mockApi = vi.fn();
    vi.stubGlobal("fetch", mockApi);
    const initialData = await fetchJournalInitialData("http://localhost:3000", "test");
    expect(initialData).toBeDefined();
  });
});
