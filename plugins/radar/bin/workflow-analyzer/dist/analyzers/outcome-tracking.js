// Deferred: Module G — Outcome Tracking
// See docs/superpowers/specs/2026-03-18-workflow-analyzer-design.md § 8
export class OutcomeTrackingAnalyzer {
    name = "outcome-tracking";
    description = "Track whether AI outputs were actually used (not yet implemented)";
    dataRequirements = {
        needsMessages: true,
        needsToolCalls: true,
        needsErrors: false,
        needsSessionGroups: true,
        needsHistory: false,
        needsExternalContext: false,
        lookbackDays: 7,
    };
    async analyze(_input) {
        return [];
    }
}
//# sourceMappingURL=outcome-tracking.js.map