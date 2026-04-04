import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
export class ClaudeCodeRuntimeProvider {
    name = "claude-code-runtime";
    async analyze(prompt, _options) {
        // Passthrough provider: writes prompt to temp file for external processing
        const tempPath = join(tmpdir(), `workflow-analyzer-${randomUUID()}.txt`);
        writeFileSync(tempPath, prompt, "utf-8");
        return `[Claude Code Runtime] Prompt written to ${tempPath}. Process externally via Claude Code skill or CLI.`;
    }
    async analyzeStructured(_prompt, _schema, _options) {
        throw new Error("analyzeStructured is not supported by claude-code-runtime provider. " +
            "Use the Claude Code skill directly or switch to the claude-api provider.");
    }
}
//# sourceMappingURL=claude-code-runtime.js.map