import { describe, it, expect, beforeEach } from "vitest";
import { ParseCache } from "../src/cache.js";
import { ParsedSession } from "../src/types/session.js";

function makeSession(id: string): ParsedSession {
  return { id, source: "claude-code", startedAt: new Date(), messages: [], toolCalls: [], errors: [], metadata: {} };
}

describe("ParseCache", () => {
  let cache: ParseCache;

  beforeEach(() => {
    cache = new ParseCache();
  });

  it("returns null for unknown paths", () => {
    expect(cache.get("/unknown/path.jsonl", 12345)).toBeNull();
  });

  it("stores and retrieves sessions by path + mtime", () => {
    const session = makeSession("s1");
    cache.set("/some/path.jsonl", 1000, [session]);
    const result = cache.get("/some/path.jsonl", 1000);
    expect(result).toEqual([session]);
  });

  it("returns null when mtime changes", () => {
    const session = makeSession("s1");
    cache.set("/some/path.jsonl", 1000, [session]);
    expect(cache.get("/some/path.jsonl", 2000)).toBeNull();
  });

  it("clear removes all entries", () => {
    cache.set("/a.jsonl", 1, [makeSession("a")]);
    cache.set("/b.jsonl", 2, [makeSession("b")]);
    cache.clear();
    expect(cache.get("/a.jsonl", 1)).toBeNull();
    expect(cache.get("/b.jsonl", 2)).toBeNull();
  });
});
