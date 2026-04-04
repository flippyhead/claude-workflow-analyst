import { ParsedSession, SessionGroup } from "../types/session.js";
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
export declare function linkSessions(sessions: ParsedSession[]): SessionGroup[];
//# sourceMappingURL=session-linker.d.ts.map