import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { LLMProvider, LLMOptions } from "./llm.interface.js";

export class ClaudeCodeRuntimeProvider implements LLMProvider {
  name = "claude-code-runtime";

  async analyze(prompt: string, _options?: LLMOptions): Promise<string> {
    // Passthrough provider: writes prompt to temp file for external processing
    const tempPath = join(tmpdir(), `workflow-analyzer-${randomUUID()}.txt`);
    writeFileSync(tempPath, prompt, "utf-8");
    return `[Claude Code Runtime] Prompt written to ${tempPath}. Process externally via Claude Code skill or CLI.`;
  }

  async analyzeStructured<T>(
    _prompt: string,
    _schema: Record<string, unknown>,
    _options?: LLMOptions
  ): Promise<T> {
    throw new Error(
      "analyzeStructured is not supported by claude-code-runtime provider. " +
      "Use the Claude Code skill directly or switch to the claude-api provider."
    );
  }
}
