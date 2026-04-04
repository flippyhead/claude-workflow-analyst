import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { parseJsonlFile } from "./jsonl-parser.js";
export class CoworkParser {
    name = "cowork";
    basePath;
    constructor(basePath) {
        this.basePath = basePath.replace(/^~/, homedir());
    }
    canParse(path) {
        return path.includes("local-agent-mode-sessions");
    }
    /**
     * Decode a cowork session directory name into a readable session name.
     * e.g. "-sessions-confident-great-sagan" -> "confident-great-sagan"
     */
    static decodeSessionName(encoded) {
        // Remove the "-sessions-" prefix if present
        const sessionsPrefix = "-sessions-";
        if (encoded.startsWith(sessionsPrefix)) {
            return encoded.substring(sessionsPrefix.length);
        }
        // Strip leading hyphen
        return encoded.replace(/^-/, "");
    }
    /**
     * Deep directory traversal:
     * basePath/{orgId}/{workspaceId}/local_{id}/.claude/projects/{name}/*.jsonl
     */
    async parse(options) {
        const sessions = [];
        try {
            await this.traverseDirectory(this.basePath, 0, options, sessions);
        }
        catch {
            // Base path doesn't exist or isn't readable
        }
        return sessions;
    }
    async traverseDirectory(dirPath, depth, options, sessions) {
        // Max depth to prevent runaway traversal
        // Structure: basePath(0) / orgId(1) / workspaceId(2) / local_id(3) / .claude(4) / projects(5) / name(6) / *.jsonl
        if (depth > 7)
            return;
        let entries;
        try {
            entries = await readdir(dirPath);
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const fullPath = join(dirPath, entry);
            if (entry.endsWith(".jsonl")) {
                // Filter by modification time
                try {
                    const fileStat = await stat(fullPath);
                    if (fileStat.mtime < options.since)
                        continue;
                    if (options.until && fileStat.mtime > options.until)
                        continue;
                }
                catch {
                    continue;
                }
                try {
                    const session = await parseJsonlFile(fullPath, this.name);
                    // Try to extract a meaningful session/project name from the path
                    const projectMatch = fullPath.match(/projects\/([^/]+)\//);
                    if (projectMatch) {
                        session.project = CoworkParser.decodeSessionName(projectMatch[1]);
                    }
                    sessions.push(session);
                }
                catch {
                    continue;
                }
            }
            else {
                // Check if it's a directory and recurse
                try {
                    const entryStat = await stat(fullPath);
                    if (entryStat.isDirectory()) {
                        await this.traverseDirectory(fullPath, depth + 1, options, sessions);
                    }
                }
                catch {
                    continue;
                }
            }
        }
    }
}
//# sourceMappingURL=cowork.js.map