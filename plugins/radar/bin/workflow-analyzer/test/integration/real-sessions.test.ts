import { describe, it, expect } from "vitest";
import { ClaudeCodeParser } from "../../src/parsers/claude-code.js";
import { CoworkParser } from "../../src/parsers/cowork.js";
import { extractTopic } from "../../src/enrichment/topic-extractor.js";
import { linkSessions } from "../../src/enrichment/session-linker.js";

describe("Integration: real session parsing", () => {
  it("parses real Claude Code sessions", async () => {
    const parser = new ClaudeCodeParser("~/.claude/projects");
    const since = new Date();
    since.setDate(since.getDate() - 3); // last 3 days

    const sessions = await parser.parse({ since });

    // Should find at least some sessions
    console.log(`Found ${sessions.length} Claude Code sessions`);
    expect(sessions.length).toBeGreaterThan(0);

    // Each session should have basic structure
    for (const session of sessions.slice(0, 5)) {
      expect(session.id).toBeTruthy();
      expect(session.source).toBe("claude-code");
      expect(session.startedAt).toBeInstanceOf(Date);
      console.log(`  ${session.project}: ${session.messages.length} msgs, ${session.toolCalls.length} tools, ${session.errors.length} errors`);
    }
  });

  it("parses real Cowork sessions", async () => {
    const parser = new CoworkParser(
      "~/Library/Application Support/Claude/local-agent-mode-sessions"
    );
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const sessions = await parser.parse({ since });

    console.log(`Found ${sessions.length} Cowork sessions`);
    // May be 0 if no recent cowork activity — that's OK
    if (sessions.length > 0) {
      expect(sessions[0].source).toBe("cowork");
    }
  });

  it("enriches and links real sessions", async () => {
    const parser = new ClaudeCodeParser("~/.claude/projects");
    const since = new Date();
    since.setDate(since.getDate() - 3);

    const sessions = await parser.parse({ since });
    if (sessions.length === 0) return;

    // Enrich
    for (const session of sessions) {
      const topic = extractTopic(session);
      session.topic = topic.topic;
      session.category = topic.category;
    }

    // Link
    const groups = linkSessions(sessions);
    console.log(`Session groups: ${groups.length}`);
    for (const group of groups) {
      console.log(`  ${group.topic} (${group.category}): ${group.sessionCount} sessions, ${group.platforms.join(", ")}`);
    }

    expect(groups.length).toBeGreaterThan(0);
  });
});
