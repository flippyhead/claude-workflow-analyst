import { describe, it, expect } from "vitest";
import { extractTopic } from "../../src/enrichment/topic-extractor.js";
import { ParsedSession } from "../../src/types/session.js";

function makeSession(overrides: Partial<ParsedSession>): ParsedSession {
  return { id: "test", source: "claude-code", startedAt: new Date(), messages: [], toolCalls: [], errors: [], metadata: {}, ...overrides };
}

describe("extractTopic", () => {
  it("uses project name for claude-code sessions", () => {
    const session = makeSession({ source: "claude-code", project: "ourchannel" });
    const result = extractTopic(session);
    expect(result.topic).toBe("ourchannel");
    expect(result.category).toBe("development");
  });
  it("classifies cowork sessions by message keywords", () => {
    const session = makeSession({ source: "cowork", project: "confident-great-sagan", messages: [{ role: "user", content: "Help me write an email to the contractor about the remodel timeline", timestamp: new Date() }] });
    const result = extractTopic(session);
    expect(result.category).toBe("writing");
  });
  it("classifies research sessions", () => {
    const session = makeSession({ source: "cowork", messages: [{ role: "user", content: "Search for the best approaches to OAuth PKCE flow in React", timestamp: new Date() }] });
    const result = extractTopic(session);
    expect(result.category).toBe("research");
  });
  it("defaults to general for ambiguous sessions", () => {
    const session = makeSession({ source: "cowork", messages: [{ role: "user", content: "Hello", timestamp: new Date() }] });
    const result = extractTopic(session);
    expect(result.category).toBe("general");
  });
});
