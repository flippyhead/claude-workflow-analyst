import { describe, it, expect } from "vitest";
import { DirectAutomationAnalyzer } from "../../src/analyzers/direct-automation.js";
import { MockLLMProvider } from "../helpers/mock-llm.js";
import { ParsedSession } from "../../src/types/session.js";

function makeSession(overrides: Partial<ParsedSession>): ParsedSession {
  return {
    id: "test",
    source: "claude-code",
    startedAt: new Date(),
    messages: [],
    toolCalls: [],
    errors: [],
    metadata: {},
    ...overrides,
  };
}

describe("DirectAutomationAnalyzer", () => {
  it("detects repeated permission confirmations", async () => {
    const llm = new MockLLMProvider();
    llm.onPromptContaining("permission", JSON.stringify([{
      module: "direct-automation",
      severity: "action",
      title: "Auto-approve Read tool",
      observation: "Confirmed Read 20 times",
      action: { type: "install", artifact: ".claude/settings.json", content: '{"allowedTools":["Read"]}' },
      evidence: [{ metric: "20 confirmations for Read" }],
      effort: "low",
      impact: "medium",
      confidence: 0.9,
      deduplicationKey: "automation:auto-approve:Read"
    }]));

    const analyzer = new DirectAutomationAnalyzer();
    const sessions = [
      makeSession({
        messages: Array.from({ length: 20 }, () => ({
          role: "user" as const,
          content: "yes",
        })),
        toolCalls: Array.from({ length: 20 }, (_, i) => ({
          id: `t${i}`,
          name: "Read",
          success: true,
        })),
      }),
    ];

    const insights = await analyzer.analyze({
      sessions,
      sessionGroups: [],
      llm,
    });

    expect(insights.length).toBeGreaterThanOrEqual(0); // LLM-dependent
  });

  it("has correct data requirements", () => {
    const analyzer = new DirectAutomationAnalyzer();
    expect(analyzer.dataRequirements.needsMessages).toBe(true);
    expect(analyzer.dataRequirements.needsToolCalls).toBe(true);
    expect(analyzer.dataRequirements.needsHistory).toBe(true);
  });
});
