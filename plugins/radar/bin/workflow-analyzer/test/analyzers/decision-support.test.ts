import { describe, it, expect } from "vitest";
import { DecisionSupportAnalyzer } from "../../src/analyzers/decision-support.js";
import { MockLLMProvider } from "../helpers/mock-llm.js";
import { SessionGroup } from "../../src/types/session.js";

describe("DecisionSupportAnalyzer", () => {
  it("has correct data requirements", () => {
    const analyzer = new DecisionSupportAnalyzer();
    expect(analyzer.dataRequirements.needsSessionGroups).toBe(true);
    expect(analyzer.dataRequirements.needsExternalContext).toBe(true);
  });

  it("produces insights when session groups exist", async () => {
    const llm = new MockLLMProvider();
    llm.onPromptContaining("allocation", JSON.stringify([{
      module: "decision-support",
      severity: "suggestion",
      title: "Already.dev not in top 3 goals",
      observation: "28% of sessions on Already.dev",
      action: { type: "decide", question: "Is Already.dev a priority?", options: ["Yes", "No"] },
      evidence: [{ metric: "28% of sessions" }],
      effort: "low",
      impact: "high",
      confidence: 0.85,
      deduplicationKey: "decision:already-dev:priority"
    }]));

    const analyzer = new DecisionSupportAnalyzer();
    const sessionGroups: SessionGroup[] = [
      { topic: "ourchannel", category: "development", sessions: [], platforms: ["claude-code"], totalDurationMinutes: 200, sessionCount: 50 },
      { topic: "already-dev", category: "development", sessions: [], platforms: ["claude-code"], totalDurationMinutes: 100, sessionCount: 30 },
    ];

    const insights = await analyzer.analyze({
      sessions: [],
      sessionGroups,
      externalContext: { goals: ["Ship OurChannel", "Launch consumer/bot"] },
      llm,
    });

    expect(insights.length).toBeGreaterThan(0);
  });
});
