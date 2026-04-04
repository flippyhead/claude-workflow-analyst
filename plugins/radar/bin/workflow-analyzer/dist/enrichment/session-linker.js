/**
 * Link and group related sessions.
 *
 * Grouping strategy:
 * - claude-code sessions: group by topic (project name)
 * - cowork sessions: group by category when topics differ
 * - Cross-platform: sessions with matching topics merge into the same group
 *
 * Returns SessionGroup[] sorted by session count descending.
 */
export function linkSessions(sessions) {
    const groupMap = new Map();
    for (const session of sessions) {
        const key = resolveGroupKey(session);
        let group = groupMap.get(key);
        if (!group) {
            group = {
                topic: session.topic ?? "unknown",
                category: session.category ?? "general",
                sessions: [],
                platforms: [],
                totalDurationMinutes: 0,
                sessionCount: 0,
            };
            groupMap.set(key, group);
        }
        group.sessions.push(session);
        group.sessionCount += 1;
        group.totalDurationMinutes += session.durationMinutes ?? 0;
        if (!group.platforms.includes(session.source)) {
            group.platforms.push(session.source);
        }
    }
    // Sort by session count descending
    const groups = Array.from(groupMap.values());
    groups.sort((a, b) => b.sessionCount - a.sessionCount);
    return groups;
}
/**
 * Determine the grouping key for a session.
 *
 * - claude-code: group by topic (project name)
 * - cowork: if topic matches an existing claude-code project name pattern, use that;
 *   otherwise group by category
 */
function resolveGroupKey(session) {
    const topic = session.topic ?? "unknown";
    const category = session.category ?? "general";
    // claude-code sessions always group by their topic (project name)
    if (session.source === "claude-code") {
        return `topic:${topic}`;
    }
    // cowork sessions: if the topic looks like a project name (single word, no spaces),
    // group by topic to enable cross-platform linking
    if (topic && !topic.includes(" ")) {
        return `topic:${topic}`;
    }
    // Otherwise group cowork sessions by category
    return `category:${category}`;
}
//# sourceMappingURL=session-linker.js.map