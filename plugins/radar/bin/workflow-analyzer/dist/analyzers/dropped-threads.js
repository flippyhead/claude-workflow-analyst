// Deferred: Module E — Dropped Threads
// Track unfinished work across sessions.
// See docs/superpowers/specs/2026-03-18-workflow-analyzer-design.md § 8
export class DroppedThreadsAnalyzer {
    name = "dropped-threads";
    description = "Track unfinished work across sessions (not yet implemented)";
    dataRequirements = {
        needsMessages: true,
        needsToolCalls: false,
        needsErrors: false,
        needsSessionGroups: true,
        needsHistory: true,
        needsExternalContext: false,
        lookbackDays: 14,
    };
    async analyze(_input) {
        return []; // Not yet implemented
    }
}
//# sourceMappingURL=dropped-threads.js.map