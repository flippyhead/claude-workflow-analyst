import { describe, it, expect } from "vitest";
import { ClaudeCodeParser } from "../../src/parsers/claude-code.js";

describe("ClaudeCodeParser", () => {
  it("has correct name", () => {
    const parser = new ClaudeCodeParser("~/.claude/projects");
    expect(parser.name).toBe("claude-code");
  });
  it("canParse returns true for ~/.claude/projects", () => {
    const parser = new ClaudeCodeParser("~/.claude/projects");
    expect(parser.canParse("/Users/test/.claude/projects")).toBe(true);
  });
  it("canParse returns false for unrelated paths", () => {
    const parser = new ClaudeCodeParser("~/.claude/projects");
    expect(parser.canParse("/tmp/random")).toBe(false);
  });
  it("extracts project name from encoded directory path", () => {
    const decoded = ClaudeCodeParser.decodeProjectPath("-Users-peterbrown-Development-ai-brain");
    expect(decoded).toBe("ai-brain");
  });
  it("handles worktree paths", () => {
    const decoded = ClaudeCodeParser.decodeProjectPath("-Users-peterbrown-Development-ourchannel-.claude-worktrees-vigorous-chatterjee");
    expect(decoded).toContain("ourchannel");
  });
});
