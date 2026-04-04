import { describe, it, expect } from "vitest";
import { prioritize } from "../src/prioritizer.js";
import { Insight } from "../src/types/insight.js";

function makeInsight(overrides: Partial<Insight>): Insight {
  return {
    module: "test",
    severity: "suggestion",
    title: "Test insight",
    observation: "observed",
    action: { type: "acknowledge", message: "ok" },
    evidence: [],
    effort: "medium",
    impact: "medium",
    confidence: 0.8,
    deduplicationKey: "test-key",
    ...overrides,
  };
}

describe("prioritize", () => {
  it("ranks high-impact / low-effort first", () => {
    const insights = [
      makeInsight({ title: "low", impact: "low", effort: "high" }),
      makeInsight({ title: "high", impact: "high", effort: "low" }),
      makeInsight({ title: "med", impact: "medium", effort: "medium" }),
    ];
    const result = prioritize(insights);
    expect(result[0].title).toBe("high");
    expect(result[result.length - 1].title).toBe("low");
  });

  it("filters by confidence threshold", () => {
    const insights = [
      makeInsight({ confidence: 0.9 }),
      makeInsight({ confidence: 0.3 }),
      makeInsight({ confidence: 0.5 }),
    ];
    const result = prioritize(insights, { confidenceThreshold: 0.5 });
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.confidence >= 0.5)).toBe(true);
  });

  it("caps at max results", () => {
    const insights = Array.from({ length: 10 }, (_, i) =>
      makeInsight({ title: `insight-${i}` })
    );
    const result = prioritize(insights, { max: 3 });
    expect(result).toHaveLength(3);
  });

  it("breaks ties with severity", () => {
    const insights = [
      makeInsight({ title: "suggestion", severity: "suggestion", impact: "high", effort: "low" }),
      makeInsight({ title: "alert", severity: "alert", impact: "high", effort: "low" }),
      makeInsight({ title: "action", severity: "action", impact: "high", effort: "low" }),
    ];
    const result = prioritize(insights);
    expect(result[0].title).toBe("alert");
    expect(result[1].title).toBe("action");
    expect(result[2].title).toBe("suggestion");
  });
});
