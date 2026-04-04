const IMPACT_WEIGHT = { high: 3, medium: 2, low: 1 };
const EFFORT_WEIGHT = { low: 1, medium: 2, high: 3 };
const SEVERITY_ORDER = { alert: 4, action: 3, suggestion: 2, info: 1 };
export function prioritize(insights, options = {}) {
    const { confidenceThreshold = 0, max } = options;
    const filtered = insights.filter((i) => i.confidence >= confidenceThreshold);
    const scored = filtered.map((insight) => {
        const score = IMPACT_WEIGHT[insight.impact] / EFFORT_WEIGHT[insight.effort];
        const severityTiebreak = SEVERITY_ORDER[insight.severity] ?? 0;
        return { insight, score, severityTiebreak };
    });
    scored.sort((a, b) => {
        if (b.score !== a.score)
            return b.score - a.score;
        return b.severityTiebreak - a.severityTiebreak;
    });
    const result = scored.map((s) => s.insight);
    return max ? result.slice(0, max) : result;
}
//# sourceMappingURL=prioritizer.js.map