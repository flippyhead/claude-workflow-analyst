// Deferred: Module F — Collaboration Quality
// See docs/superpowers/specs/2026-03-18-workflow-analyzer-design.md § 8
export class CollaborationQualityAnalyzer {
    name = "collaboration-quality";
    description = "Analyze how effectively the user works with AI (not yet implemented)";
    dataRequirements = {
        needsMessages: true,
        needsToolCalls: true,
        needsErrors: false,
        needsSessionGroups: false,
        needsHistory: false,
        needsExternalContext: false,
        lookbackDays: 7,
    };
    async analyze(_input) {
        return [];
    }
}
//# sourceMappingURL=collaboration-quality.js.map