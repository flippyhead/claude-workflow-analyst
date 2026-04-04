import { describe, it, expect } from "vitest";
import { RootCauseAnalyzer } from "../../src/analyzers/root-cause.js";
import { MockLLMProvider } from "../helpers/mock-llm.js";
import { ParsedSession, SessionGroup } from "../../src/types/session.js";

function makeSession(errors: ParsedSession["errors"], toolCalls: ParsedSession["toolCalls"]): ParsedSession {
  return {
    id: "test",
    source: "claude-code",
    startedAt: new Date(),
    messages: [],
    toolCalls,
    errors,
    metadata: {},
  };
}

describe("RootCauseAnalyzer", () => {
  it("has correct data requirements", () => {
    const analyzer = new RootCauseAnalyzer();
    expect(analyzer.dataRequirements.needsErrors).toBe(true);
    expect(analyzer.dataRequirements.needsToolCalls).toBe(true);
    expect(analyzer.dataRequirements.needsMessages).toBe(false);
  });

  it("produces insights for tools with high failure rates", async () => {
    const llm = new MockLLMProvider();
    llm.onPromptContaining("error", JSON.stringify([
      {
        module: "root-cause",
        severity: "action",
        title: "Neon list_projects — auth expired",
        observation: "46% failure rate",
        diagnosis: "API key expired",
        action: { type: "run", command: "neon auth login", explanation: "Re-authenticate" },
        evidence: [{ metric: "6/13 calls failed" }],
        effort: "low",
        impact: "medium",
        confidence: 0.9,
        deduplicationKey: "root-cause:neon:list_projects:auth"
      }
    ]));

    const analyzer = new RootCauseAnalyzer();
    const sessions = [
      makeSession(
        [
          { toolName: "mcp__Neon__list_projects", errorMessage: "authentication failed: invalid token", timestamp: new Date(), sessionContext: "checking db" },
          { toolName: "mcp__Neon__list_projects", errorMessage: "authentication failed: invalid token", timestamp: new Date(), sessionContext: "listing projects" },
        ],
        [
          { id: "t1", name: "mcp__Neon__list_projects", success: false, errorMessage: "authentication failed" },
          { id: "t2", name: "mcp__Neon__list_projects", success: false, errorMessage: "authentication failed" },
          { id: "t3", name: "mcp__Neon__list_projects", success: true },
        ]
      ),
    ];

    const insights = await analyzer.analyze({
      sessions,
      sessionGroups: [],
      llm,
    });

    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0].module).toBe("root-cause");
  });

  it("skips tools with low failure counts", async () => {
    const llm = new MockLLMProvider();
    llm.onPromptContaining("error", "[]");

    const analyzer = new RootCauseAnalyzer();
    const sessions = [
      makeSession(
        [{ toolName: "Read", errorMessage: "file not found", timestamp: new Date(), sessionContext: "" }],
        [
          { id: "t1", name: "Read", success: false, errorMessage: "file not found" },
          ...Array.from({ length: 50 }, (_, i) => ({
            id: `t${i + 2}`,
            name: "Read",
            success: true as const,
          })),
        ]
      ),
    ];

    const insights = await analyzer.analyze({
      sessions,
      sessionGroups: [],
      llm,
    });

    // 1 failure out of 51 calls = ~2% — below threshold
    expect(insights).toHaveLength(0);
  });
});
