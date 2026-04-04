const CONFIRMATION_PATTERNS = ["yes", "y", "a", "go ahead", "ok", "sure", "proceed"];
const MIN_CONFIRMATIONS = 10;
export class DirectAutomationAnalyzer {
    name = "direct-automation";
    description = "Detects repeated patterns that could be automated as skills, hooks, or config";
    dataRequirements = {
        needsMessages: true,
        needsToolCalls: true,
        needsErrors: false,
        needsSessionGroups: false,
        needsHistory: true,
        needsExternalContext: false,
        lookbackDays: 7,
    };
    async analyze(input) {
        const insights = [];
        // 1. Detect permission confirmation patterns
        const confirmationInsights = this.detectConfirmations(input);
        insights.push(...confirmationInsights);
        // 2. Detect repeated prompt patterns
        const promptInsights = await this.detectRepeatedPrompts(input);
        insights.push(...promptInsights);
        // 3. Detect repeated tool sequences (ask LLM to evaluate)
        const sequenceInsights = await this.detectRepeatedSequences(input);
        insights.push(...sequenceInsights);
        return insights;
    }
    detectConfirmations(input) {
        // Count single-word confirmation messages
        const toolConfirmations = new Map();
        for (const session of input.sessions) {
            let lastToolName;
            for (let i = 0; i < session.messages.length; i++) {
                const msg = session.messages[i];
                if (msg.role === "user" && CONFIRMATION_PATTERNS.includes(msg.content.trim().toLowerCase())) {
                    // Find the tool call that preceded this confirmation
                    if (lastToolName) {
                        const count = toolConfirmations.get(lastToolName) ?? 0;
                        toolConfirmations.set(lastToolName, count + 1);
                    }
                }
            }
            // Track tool names from tool calls for correlation
            for (const tc of session.toolCalls) {
                lastToolName = tc.name;
            }
        }
        const insights = [];
        const highConfirmationTools = Array.from(toolConfirmations.entries())
            .filter(([_, count]) => count >= MIN_CONFIRMATIONS)
            .sort((a, b) => b[1] - a[1]);
        if (highConfirmationTools.length > 0) {
            const toolNames = highConfirmationTools.map(([name]) => name);
            const totalConfirmations = highConfirmationTools.reduce((sum, [_, c]) => sum + c, 0);
            insights.push({
                module: this.name,
                severity: "action",
                title: `Auto-approve ${toolNames.slice(0, 3).join(", ")} tools`,
                observation: `You confirmed tool permissions ${totalConfirmations} times this week across ${toolNames.length} tools.`,
                diagnosis: `Read-only and safe tools like ${toolNames.slice(0, 3).join(", ")} don't need confirmation each time.`,
                action: {
                    type: "install",
                    artifact: ".claude/settings.json",
                    content: JSON.stringify({ allowedTools: toolNames }, null, 2),
                },
                evidence: highConfirmationTools.map(([name, count]) => ({
                    metric: `${name}: ${count} confirmations`,
                })),
                effort: "low",
                impact: "medium",
                confidence: 0.9,
                deduplicationKey: `automation:auto-approve:${toolNames.sort().join(",")}`,
            });
        }
        return insights;
    }
    async detectRepeatedPrompts(input) {
        // Count user prompt frequency across sessions
        const promptCounts = new Map();
        for (const session of input.sessions) {
            for (const msg of session.messages) {
                if (msg.role === "user" && msg.content.length > 10 && msg.content.length < 200) {
                    // Normalize: lowercase, trim
                    const normalized = msg.content.toLowerCase().trim();
                    const count = promptCounts.get(normalized) ?? 0;
                    promptCounts.set(normalized, count + 1);
                }
            }
        }
        const frequentPrompts = Array.from(promptCounts.entries())
            .filter(([_, count]) => count >= 5)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        if (frequentPrompts.length === 0)
            return [];
        // Ask LLM which prompts are worth automating
        const prompt = `These prompts are typed frequently by the user. Which ones could be automated as Claude Code skills, hooks, or aliases?

${frequentPrompts.map(([p, c]) => `- "${p}" (${c} times)`).join("\n")}

For each automatable prompt, respond with a JSON array of insights with:
- module: "direct-automation"
- severity: "suggestion"
- title: short description
- observation: what was detected
- action: { type: "install", artifact: "skill or hook name", content: "the skill/hook content" }
- evidence: [{ metric: "frequency stat" }]
- effort/impact/confidence
- deduplicationKey

Only include prompts worth automating. Skip trivial ones. Return [] if none qualify.`;
        try {
            const result = await input.llm.analyzeStructured(prompt, { type: "array" });
            return Array.isArray(result) ? result : [];
        }
        catch {
            return [];
        }
    }
    async detectRepeatedSequences(input) {
        // Extract tool call sequences (runs of 3+ tools)
        const sequences = [];
        for (const session of input.sessions) {
            const toolNames = session.toolCalls.map((tc) => tc.name);
            // Extract all subsequences of length 3-6
            for (let len = 3; len <= Math.min(6, toolNames.length); len++) {
                for (let i = 0; i <= toolNames.length - len; i++) {
                    sequences.push(toolNames.slice(i, i + len));
                }
            }
        }
        // Count sequence frequency
        const seqCounts = new Map();
        for (const seq of sequences) {
            const key = seq.join(" → ");
            seqCounts.set(key, (seqCounts.get(key) ?? 0) + 1);
        }
        const frequentSequences = Array.from(seqCounts.entries())
            .filter(([_, count]) => count >= 5)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        if (frequentSequences.length === 0)
            return [];
        // Let LLM evaluate if these are worth automating
        const prompt = `These tool call sequences repeat frequently. Which suggest automatable workflows?

${frequentSequences.map(([seq, c]) => `- ${seq} (${c} times)`).join("\n")}

Return a JSON array of insights for sequences worth automating (or [] if none).
Each insight: module "direct-automation", severity, title, observation, action (type: "install" with skill content), evidence, effort, impact, confidence, deduplicationKey.`;
        try {
            const result = await input.llm.analyzeStructured(prompt, { type: "array" });
            return Array.isArray(result) ? result : [];
        }
        catch {
            return [];
        }
    }
}
//# sourceMappingURL=direct-automation.js.map