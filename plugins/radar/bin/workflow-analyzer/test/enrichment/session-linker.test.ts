import { describe, it, expect } from "vitest";
import { linkSessions } from "../../src/enrichment/session-linker.js";
import { ParsedSession } from "../../src/types/session.js";

function makeSession(overrides: Partial<ParsedSession>): ParsedSession {
  return { id: "test", source: "claude-code", startedAt: new Date(), messages: [], toolCalls: [], errors: [], metadata: {}, topic: "default", category: "general", ...overrides };
}

describe("linkSessions", () => {
  it("groups sessions by project for claude-code", () => {
    const sessions = [
      makeSession({ id: "s1", source: "claude-code", project: "ourchannel", topic: "ourchannel", category: "development", durationMinutes: 10 }),
      makeSession({ id: "s2", source: "claude-code", project: "ourchannel", topic: "ourchannel", category: "development", durationMinutes: 20 }),
      makeSession({ id: "s3", source: "claude-code", project: "ai-brain", topic: "ai-brain", category: "development", durationMinutes: 5 }),
    ];
    const groups = linkSessions(sessions);
    expect(groups).toHaveLength(2);
    const ourchannel = groups.find((g) => g.topic === "ourchannel");
    expect(ourchannel).toBeDefined();
    expect(ourchannel!.sessionCount).toBe(2);
    expect(ourchannel!.totalDurationMinutes).toBe(30);
  });
  it("groups cowork sessions by category when topics differ", () => {
    const sessions = [
      makeSession({ id: "s1", source: "cowork", topic: "email about remodel", category: "writing", durationMinutes: 5 }),
      makeSession({ id: "s2", source: "cowork", topic: "draft blog post", category: "writing", durationMinutes: 10 }),
    ];
    const groups = linkSessions(sessions);
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe("writing");
    expect(groups[0].sessionCount).toBe(2);
  });
  it("tracks platforms in cross-platform groups", () => {
    const sessions = [
      makeSession({ id: "s1", source: "claude-code", project: "ourchannel", topic: "ourchannel", category: "development", durationMinutes: 10 }),
      makeSession({ id: "s2", source: "cowork", topic: "ourchannel", category: "development", durationMinutes: 5 }),
    ];
    const groups = linkSessions(sessions);
    const group = groups.find((g) => g.topic === "ourchannel");
    expect(group).toBeDefined();
    expect(group!.platforms).toContain("claude-code");
    expect(group!.platforms).toContain("cowork");
  });
});
