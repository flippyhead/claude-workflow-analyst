import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { parseJsonlFile } from "./jsonl-parser.js";
export class ClaudeCodeParser {
    name = "claude-code";
    basePath;
    constructor(basePath) {
        this.basePath = basePath.replace(/^~/, homedir());
    }
    canParse(path) {
        return path.includes(".claude/projects");
    }
    /**
     * Decode an encoded project directory name into a human-readable project name.
     * e.g. "-Users-peterbrown-Development-ai-brain" -> "ai-brain"
     */
    static decodeProjectPath(encoded) {
        // The encoded directory name represents a filesystem path with / replaced by -.
        // We need to extract the project name from it.
        //
        // Known parent directories help us find boundaries since hyphens are ambiguous
        // (they can be path separators OR literal hyphens in directory names).
        const knownParents = [
            "Development",
            "Documents",
            "Desktop",
            "Projects",
            "repos",
            "src",
            "code",
            "work",
            "sites",
            "workspace",
            "home",
            "Users",
        ];
        // For worktree paths, extract the project name before .claude
        const claudeMarker = "-.claude-";
        const claudeIdx = encoded.indexOf(claudeMarker);
        if (claudeIdx > 0) {
            // Get the portion before .claude, then find the project name
            const beforeClaude = encoded.substring(0, claudeIdx);
            return ClaudeCodeParser.decodeProjectPath(beforeClaude);
        }
        // Find the last known parent directory in the encoded string
        // and take everything after it as the project name
        let lastParentEnd = -1;
        for (const parent of knownParents) {
            const pattern = `-${parent}-`;
            const idx = encoded.indexOf(pattern);
            if (idx >= 0) {
                const end = idx + pattern.length;
                if (end > lastParentEnd) {
                    lastParentEnd = end;
                }
            }
        }
        if (lastParentEnd > 0) {
            return encoded.substring(lastParentEnd);
        }
        // Fallback: take the last hyphen-separated segment
        const parts = encoded.split("-").filter(Boolean);
        return parts[parts.length - 1];
    }
    async parse(options) {
        const sessions = [];
        const resolvedBase = this.basePath;
        let projectDirs;
        try {
            projectDirs = await readdir(resolvedBase);
        }
        catch {
            return sessions;
        }
        for (const encodedDir of projectDirs) {
            const projectName = ClaudeCodeParser.decodeProjectPath(encodedDir);
            // Apply project filter if specified
            if (options.projectFilter &&
                options.projectFilter.length > 0 &&
                !options.projectFilter.includes(projectName)) {
                continue;
            }
            const projectPath = join(resolvedBase, encodedDir);
            let files;
            try {
                files = await readdir(projectPath);
            }
            catch {
                continue;
            }
            const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));
            for (const file of jsonlFiles) {
                const filePath = join(projectPath, file);
                // Filter by modification time
                try {
                    const fileStat = await stat(filePath);
                    if (fileStat.mtime < options.since)
                        continue;
                    if (options.until && fileStat.mtime > options.until)
                        continue;
                }
                catch {
                    continue;
                }
                try {
                    const session = await parseJsonlFile(filePath, this.name);
                    session.project = projectName;
                    sessions.push(session);
                }
                catch {
                    // Skip unparseable files
                    continue;
                }
            }
        }
        return sessions;
    }
}
//# sourceMappingURL=claude-code.js.map