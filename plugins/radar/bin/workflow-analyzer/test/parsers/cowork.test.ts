import { describe, it, expect } from "vitest";
import { CoworkParser } from "../../src/parsers/cowork.js";

describe("CoworkParser", () => {
  it("has correct name", () => {
    const parser = new CoworkParser("~/Library/Application Support/Claude/local-agent-mode-sessions");
    expect(parser.name).toBe("cowork");
  });
  it("canParse returns true for local-agent-mode-sessions", () => {
    const parser = new CoworkParser("~/Library/Application Support/Claude/local-agent-mode-sessions");
    expect(parser.canParse("/Users/test/Library/Application Support/Claude/local-agent-mode-sessions")).toBe(true);
  });
  it("canParse returns false for unrelated paths", () => {
    const parser = new CoworkParser("~/Library/Application Support/Claude/local-agent-mode-sessions");
    expect(parser.canParse("/tmp/random")).toBe(false);
  });
  it("decodes cowork session names", () => {
    const decoded = CoworkParser.decodeSessionName("-sessions-confident-great-sagan");
    expect(decoded).toBe("confident-great-sagan");
  });
});
