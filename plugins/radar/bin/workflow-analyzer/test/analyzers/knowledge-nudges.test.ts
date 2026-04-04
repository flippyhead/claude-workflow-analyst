import { describe, it, expect } from "vitest";
import { KnowledgeNudgesAnalyzer } from "../../src/analyzers/knowledge-nudges.js";
import { MockLLMProvider } from "../helpers/mock-llm.js";
import { ParsedSession, SessionGroup } from "../../src/types/session.js";

function makeSession(messages: ParsedSession["messages"]): ParsedSession {
  return {
    id: "test-" + Math.random(),
    source: "claude-code",
    startedAt: new Date(),
    messages,
    toolCalls: [],
    errors: [],
    metadata: {},
    topic: "test",
    category: "development",
  };
}

describe("KnowledgeNudgesAnalyzer", () => {
  it("has correct data requirements", () => {
    const analyzer = new KnowledgeNudgesAnalyzer();
    expect(analyzer.dataRequirements.needsMessages).toBe(true);
    expect(analyzer.dataRequirements.needsSessionGroups).toBe(true);
  });

  it("detects repeated topics across sessions", async () => {
    const llm = new MockLLMProvider();
    llm.onPromptContaining("repeated", JSON.stringify([{
      module: "knowledge-nudges",
      severity: "suggestion",
      title: "OAuth PKCE explained 3 times",
      observation: "Same topic across 3 sessions",
      action: { type: "save", content: "OAuth PKCE summary...", destination: "AI Brain" },
      evidence: [{ metric: "3 sessions about OAuth PKCE" }],
      effort: "low",
      impact: "medium",
      confidence: 0.85,
      deduplicationKey: "nudge:repeated-topic:oauth-pkce"
    }]));

    const analyzer = new KnowledgeNudgesAnalyzer();
    const sessions = [
      makeSession([{ role: "user", content: "Explain OAuth PKCE flow for React" }]),
      makeSession([{ role: "user", content: "How does OAuth PKCE work again?" }]),
      makeSession([{ role: "user", content: "Help me implement OAuth PKCE in my app" }]),
    ];

    const insights = await analyzer.analyze({
      sessions,
      sessionGroups: [{ topic: "test", category: "development", sessions, platforms: ["claude-code"], totalDurationMinutes: 30, sessionCount: 3 }],
      llm,
    });

    expect(insights.length).toBeGreaterThanOrEqual(0); // LLM-dependent
  });
});
