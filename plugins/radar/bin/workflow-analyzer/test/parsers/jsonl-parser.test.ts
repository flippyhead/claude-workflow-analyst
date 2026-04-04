import { describe, it, expect } from "vitest";
import { parseJsonlFile } from "../../src/parsers/jsonl-parser.js";
import { resolve } from "path";

const fixturesDir = resolve(import.meta.dirname, "../fixtures");

describe("parseJsonlFile", () => {
  it("extracts messages from a simple session", async () => {
    const session = await parseJsonlFile(
      resolve(fixturesDir, "simple-session.jsonl"),
      "test-source"
    );
    expect(session.id).toBe("test-session-1");
    expect(session.source).toBe("test-source");
    expect(session.messages).toHaveLength(2); // 1 user + 1 assistant text
    expect(session.messages[0].role).toBe("user");
    expect(session.messages[0].content).toContain("README");
    expect(session.messages[1].role).toBe("assistant");
  });

  it("extracts tool calls with success/failure", async () => {
    const session = await parseJsonlFile(
      resolve(fixturesDir, "simple-session.jsonl"),
      "test-source"
    );
    expect(session.toolCalls).toHaveLength(1);
    expect(session.toolCalls[0].name).toBe("Read");
    expect(session.toolCalls[0].success).toBe(true);
  });

  it("extracts errors with actual error messages", async () => {
    const session = await parseJsonlFile(
      resolve(fixturesDir, "error-session.jsonl"),
      "test-source"
    );
    expect(session.errors.length).toBeGreaterThan(0);
    expect(session.errors[0].toolName).toBe("Edit");
    expect(session.errors[0].errorMessage).toContain("old_string not found");
  });

  it("detects retry sequences", async () => {
    const session = await parseJsonlFile(
      resolve(fixturesDir, "error-session.jsonl"),
      "test-source"
    );
    const retry = session.toolCalls.find((tc) => tc.retryOf);
    expect(retry).toBeDefined();
    expect(retry!.name).toBe("Edit");
  });

  it("detects permission denials as errors", async () => {
    const session = await parseJsonlFile(
      resolve(fixturesDir, "error-session.jsonl"),
      "test-source"
    );
    const denial = session.errors.find((e) => e.errorMessage.includes("denied"));
    expect(denial).toBeDefined();
    expect(denial!.toolName).toBe("Write");
  });

  it("extracts timestamps and computes duration", async () => {
    const session = await parseJsonlFile(
      resolve(fixturesDir, "simple-session.jsonl"),
      "test-source"
    );
    expect(session.startedAt).toBeInstanceOf(Date);
    expect(session.endedAt).toBeInstanceOf(Date);
    expect(session.durationMinutes).toBeGreaterThan(0);
  });

  it("skips malformed lines gracefully", async () => {
    const session = await parseJsonlFile(
      resolve(fixturesDir, "simple-session.jsonl"),
      "test-source"
    );
    expect(session).toBeDefined();
  });
});
