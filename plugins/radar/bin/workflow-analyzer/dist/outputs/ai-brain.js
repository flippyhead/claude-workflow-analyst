const MODULE_TO_CATEGORY = {
    "root-cause": "development",
    "direct-automation": "automation",
    "decision-support": "decisions",
    "knowledge-nudges": "learning",
};
export class AIBrainOutput {
    name = "ai-brain";
    endpoint;
    constructor(endpoint) {
        this.endpoint = endpoint.replace(/\/$/, "");
    }
    async publish(insights, metadata) {
        const since = metadata.period.since.toISOString().split("T")[0];
        const until = metadata.period.until.toISOString().split("T")[0];
        const title = `Workflow Analysis: ${since} to ${until}`;
        const sections = insights.map((insight) => ({
            title: insight.title,
            severity: insight.severity,
            observation: insight.observation,
            diagnosis: insight.diagnosis,
            module: insight.module,
            category: MODULE_TO_CATEGORY[insight.module] ?? "general",
        }));
        const content = JSON.stringify({
            title,
            sessionCount: metadata.sessionCount,
            sources: metadata.sources,
            period: { since, until },
            insights: sections,
        }, null, 2);
        try {
            const response = await fetch(`${this.endpoint}/api/mcp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    method: "create_report",
                    params: {
                        title,
                        content,
                        type: "reference",
                    },
                }),
            });
            if (!response.ok) {
                console.warn(`[ai-brain] Non-fatal: failed to publish report (HTTP ${response.status})`);
            }
        }
        catch (err) {
            // Non-fatal — AI Brain may not be running
            console.warn(`[ai-brain] Non-fatal: could not reach endpoint at ${this.endpoint}`, err instanceof Error ? err.message : err);
        }
    }
}
//# sourceMappingURL=ai-brain.js.map