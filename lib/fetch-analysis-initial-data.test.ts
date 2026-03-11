import { describe, it, expect, vi } from "vitest";
import { fetchAnalysisInitialData } from "./fetch-analysis-initial-data";

describe("fetchAnalysisInitialData", () => {
    it("初期データを取得する", async () => {
        const initialData = await fetchAnalysisInitialData("http://localhost:3000", "test");

        expect(initialData).toBeDefined();
    });
});

