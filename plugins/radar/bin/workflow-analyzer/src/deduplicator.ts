import { Insight } from "./types/insight.js";
import { AnalyzerState, InsightHistoryEntry } from "./types/config.js";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_DISMISS_COUNT = 2;

export function deduplicate(insights: Insight[], state: AnalyzerState): Insight[] {
  const now = Date.now();
  const historyMap = new Map<string, InsightHistoryEntry>();
  for (const entry of state.insightHistory) {
    historyMap.set(entry.deduplicationKey, entry);
  }

  return insights.filter((insight) => {
    // Alerts always pass through
    if (insight.severity === "alert") return true;

    const entry = historyMap.get(insight.deduplicationKey);
    if (!entry) return true;

    // Suppress if dismissed too many times
    if (entry.dismissCount >= MAX_DISMISS_COUNT) return false;

    // Suppress if seen recently (within staleness window)
    const lastSeen = new Date(entry.lastSeen).getTime();
    if (now - lastSeen < TWO_WEEKS_MS) return false;

    return true;
  });
}

export function updateState(
  state: AnalyzerState,
  publishedInsights: Insight[]
): AnalyzerState {
  const now = new Date().toISOString();
  const historyMap = new Map<string, InsightHistoryEntry>();
  for (const entry of state.insightHistory) {
    historyMap.set(entry.deduplicationKey, entry);
  }

  for (const insight of publishedInsights) {
    const existing = historyMap.get(insight.deduplicationKey);
    if (existing) {
      existing.lastSeen = now;
      existing.timesSurfaced += 1;
    } else {
      historyMap.set(insight.deduplicationKey, {
        deduplicationKey: insight.deduplicationKey,
        firstSeen: now,
        lastSeen: now,
        timesSurfaced: 1,
        dismissCount: 0,
      });
    }
  }

  return {
    ...state,
    lastRun: now,
    insightHistory: [...historyMap.values()],
  };
}
