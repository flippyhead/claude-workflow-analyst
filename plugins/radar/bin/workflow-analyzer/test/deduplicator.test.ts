import { describe, it, expect } from "vitest";
import { deduplicate, updateState } from "../src/deduplicator.js";
import { Insight } from "../src/types/insight.js";
import { AnalyzerState } from "../src/types/config.js";

function makeInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    module: "test",
    severity: "suggestion",
    title: "Test",
    observation: "obs",
    action: { type: "acknowledge", message: "ok" },
    evidence: [],
    effort: "low",
    impact: "medium",
    confidence: 0.8,
    deduplicationKey: "key-1",
    ...overrides,
  };
}

function makeState(overrides: Partial<AnalyzerState> = {}): AnalyzerState {
  return {
    lastRun: new Date().toISOString(),
    insightHistory: [],
    parseCacheMeta: { parserVersion: "1.0", lastCacheClean: new Date().toISOString() },
    ...overrides,
  };
}

describe("deduplicate", () => {
  it("passes through new insights not in history", () => {
    const insights = [makeInsight({ deduplicationKey: "new-key" })];
    const state = makeState();
    const result = deduplicate(insights, state);
    expect(result).toHaveLength(1);
  });

  it("filters insights seen recently (within 2 weeks)", () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const state = makeState({
      insightHistory: [
        {
          deduplicationKey: "key-1",
          firstSeen: recent.toISOString(),
          lastSeen: recent.toISOString(),
          timesSurfaced: 1,
          dismissCount: 0,
        },
      ],
    });
    const insights = [makeInsight({ deduplicationKey: "key-1" })];
    const result = deduplicate(insights, state);
    expect(result).toHaveLength(0);
  });

  it("suppresses insights dismissed 2+ times", () => {
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago — stale
    const state = makeState({
      insightHistory: [
        {
          deduplicationKey: "key-1",
          firstSeen: old.toISOString(),
          lastSeen: old.toISOString(),
          timesSurfaced: 3,
          userFeedback: "dismissed",
          dismissCount: 2,
        },
      ],
    });
    const insights = [makeInsight({ deduplicationKey: "key-1" })];
    const result = deduplicate(insights, state);
    expect(result).toHaveLength(0);
  });

  it("allows alert severity through even if recently seen", () => {
    const recent = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const state = makeState({
      insightHistory: [
        {
          deduplicationKey: "alert-key",
          firstSeen: recent.toISOString(),
          lastSeen: recent.toISOString(),
          timesSurfaced: 1,
          dismissCount: 0,
        },
      ],
    });
    const insights = [makeInsight({ deduplicationKey: "alert-key", severity: "alert" })];
    const result = deduplicate(insights, state);
    expect(result).toHaveLength(1);
  });
});

describe("updateState", () => {
  it("adds new entries for published insights", () => {
    const state = makeState();
    const insights = [makeInsight({ deduplicationKey: "new-key" })];
    const updated = updateState(state, insights);
    expect(updated.insightHistory).toHaveLength(1);
    expect(updated.insightHistory[0].deduplicationKey).toBe("new-key");
    expect(updated.insightHistory[0].timesSurfaced).toBe(1);
  });
});
