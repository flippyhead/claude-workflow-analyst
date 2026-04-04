const MIN_CALLS_FOR_ANALYSIS = 3;
const MIN_FAILURE_RATE = 0.2; // 20%
export class RootCauseAnalyzer {
    name = "root-cause";
    description = "Diagnoses why tools fail and prescribes concrete fixes";
    dataRequirements = {
        needsMessages: false,
        needsToolCalls: true,
        needsErrors: true,
        needsSessionGroups: false,
        needsHistory: false,
        needsExternalContext: false,
        lookbackDays: 7,
    };
    async analyze(input) {
        // Aggregate tool calls and errors across all sessions
        const toolStats = new Map();
        for (const session of input.sessions) {
            for (const tc of session.toolCalls) {
                const stats = toolStats.get(tc.name) ?? { total: 0, failures: 0, errors: [] };
                stats.total++;
                if (!tc.success) {
                    stats.failures++;
                    if (tc.errorMessage) {
                        stats.errors.push(tc.errorMessage);
                    }
                }
                toolStats.set(tc.name, stats);
            }
        }
        // Find tools with problematic failure rates
        const problematicTools = [];
        for (const [name, stats] of toolStats) {
            if (stats.total < MIN_CALLS_FOR_ANALYSIS)
                continue;
            const rate = stats.failures / stats.total;
            if (rate < MIN_FAILURE_RATE)
                continue;
            problematicTools.push({
                name,
                total: stats.total,
                failures: stats.failures,
                rate,
                errors: [...new Set(stats.errors)].slice(0, 10), // deduplicate, cap at 10
            });
        }
        if (problematicTools.length === 0)
            return [];
        // Send to LLM for diagnosis
        const prompt = buildDiagnosisPrompt(problematicTools);
        try {
            const insights = await input.llm.analyzeStructured(prompt, { type: "array", items: { type: "object" } });
            // Ensure module is set correctly
            return insights.map((i) => ({ ...i, module: this.name }));
        }
        catch {
            // If structured parsing fails, return basic insights
            return problematicTools.map((tool) => ({
                module: this.name,
                severity: tool.rate > 0.5 ? "alert" : "action",
                title: `${tool.name} — ${Math.round(tool.rate * 100)}% failure rate`,
                observation: `${tool.failures}/${tool.total} calls failed`,
                diagnosis: tool.errors[0] ?? "Unknown error",
                action: {
                    type: "review",
                    summary: `Check ${tool.name} configuration. Common errors: ${tool.errors.slice(0, 3).join("; ")}`,
                    links: [],
                },
                evidence: [{ metric: `${tool.failures}/${tool.total} calls failed (${Math.round(tool.rate * 100)}%)` }],
                effort: "low",
                impact: tool.rate > 0.5 ? "high" : "medium",
                confidence: 0.8,
                deduplicationKey: `root-cause:${tool.name}:${tool.errors[0]?.slice(0, 50) ?? "unknown"}`,
            }));
        }
    }
}
function buildDiagnosisPrompt(tools) {
    return `Analyze these tool failures and diagnose the root cause for each. For each tool, determine:
1. What is causing the failures (auth issue, config problem, API bug, user error, transient)?
2. Is it fixable by the user? If yes, what specific command or action fixes it?
3. If not fixable, should the user stop worrying about it?

Tools with failures:
${tools.map((t) => `
### ${t.name}
- Calls: ${t.total}, Failures: ${t.failures} (${Math.round(t.rate * 100)}%)
- Error messages: ${t.errors.map((e) => `  - "${e}"`).join("\n")}
`).join("\n")}

Respond with a JSON array of insights. Each insight must have:
- module: "root-cause"
- severity: "action" (fixable) or "acknowledge" (not fixable)
- title: one-line summary
- observation: what was noticed
- diagnosis: root cause explanation
- action: { type: "run", command: "...", explanation: "..." } for fixable, or { type: "acknowledge", message: "..." } for not fixable
- evidence: [{ metric: "failure stat" }]
- effort: "low" | "medium" | "high"
- impact: "low" | "medium" | "high"
- confidence: 0.0-1.0
- deduplicationKey: "root-cause:{tool}:{cause}"`;
}
//# sourceMappingURL=root-cause.js.map