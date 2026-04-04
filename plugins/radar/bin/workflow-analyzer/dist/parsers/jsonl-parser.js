import { readFile } from "node:fs/promises";
export async function parseJsonlFile(filePath, source) {
    const raw = await readFile(filePath, "utf-8");
    const lines = raw.split("\n").filter((line) => line.trim().length > 0);
    const messages = [];
    const toolCalls = [];
    const errors = [];
    let sessionId = "";
    let startedAt;
    let endedAt;
    let cwd;
    // Map tool_use id -> ToolCall for result matching
    const toolCallById = new Map();
    // Track last failed tool call by tool name for retry detection
    const lastFailedByName = new Map(); // toolName -> toolCall.id
    for (const line of lines) {
        let entry;
        try {
            entry = JSON.parse(line);
        }
        catch {
            // Skip malformed lines
            continue;
        }
        const entryType = entry.type;
        // Extract session metadata from first entry that has it
        if (entry.sessionId && !sessionId) {
            sessionId = entry.sessionId;
        }
        if (entry.cwd && !cwd) {
            cwd = entry.cwd;
        }
        // Track timestamps
        if (entry.timestamp) {
            const ts = new Date(entry.timestamp);
            if (!startedAt || ts < startedAt) {
                startedAt = ts;
            }
            if (!endedAt || ts > endedAt) {
                endedAt = ts;
            }
        }
        // Skip housekeeping entries
        if (entryType === "queue-operation" ||
            entryType === "progress") {
            continue;
        }
        if (entryType === "user" || entryType === "human") {
            const content = typeof entry.message.content === "string"
                ? entry.message.content
                : extractTextFromBlocks(entry.message.content);
            if (content) {
                messages.push({
                    role: "user",
                    content,
                    timestamp: entry.timestamp ? new Date(entry.timestamp) : undefined,
                });
            }
        }
        else if (entryType === "assistant") {
            const contentBlocks = Array.isArray(entry.message.content)
                ? entry.message.content
                : [];
            // Process tool_use blocks
            for (const block of contentBlocks) {
                if (block.type === "tool_use" && block.id && block.name) {
                    // Check if this is a retry of a previously failed tool
                    let retryOf;
                    const lastFailedId = lastFailedByName.get(block.name);
                    if (lastFailedId) {
                        retryOf = lastFailedId;
                        // Clear after using — only the immediate next call is a retry
                        lastFailedByName.delete(block.name);
                    }
                    const tc = {
                        id: block.id,
                        name: block.name,
                        success: true, // assume success until we see an error result
                        timestamp: entry.timestamp
                            ? new Date(entry.timestamp)
                            : undefined,
                        retryOf,
                    };
                    toolCalls.push(tc);
                    toolCallById.set(block.id, tc);
                }
            }
            // Process text blocks as assistant messages
            const textContent = extractTextFromBlocks(contentBlocks);
            if (textContent) {
                messages.push({
                    role: "assistant",
                    content: textContent,
                    timestamp: entry.timestamp ? new Date(entry.timestamp) : undefined,
                });
            }
        }
        else if (entryType === "tool_result") {
            const contentBlocks = Array.isArray(entry.message.content)
                ? entry.message.content
                : [];
            for (const block of contentBlocks) {
                if (block.type !== "tool_result" || !block.tool_use_id)
                    continue;
                const tc = toolCallById.get(block.tool_use_id);
                if (!tc)
                    continue;
                const resultContent = typeof block.content === "string" ? block.content : "";
                const isError = block.is_error === true;
                const isDenied = resultContent.includes("User denied tool call");
                if (isError || isDenied) {
                    tc.success = false;
                    tc.errorMessage = resultContent;
                    // Record in lastFailedByName for retry detection
                    lastFailedByName.set(tc.name, tc.id);
                    const timestamp = entry.timestamp
                        ? new Date(entry.timestamp)
                        : startedAt ?? new Date();
                    errors.push({
                        toolName: tc.name,
                        errorMessage: resultContent,
                        timestamp,
                        sessionContext: cwd ?? "",
                    });
                }
            }
        }
    }
    const durationMinutes = startedAt && endedAt
        ? (endedAt.getTime() - startedAt.getTime()) / 60000
        : undefined;
    return {
        id: sessionId || filePath,
        source,
        project: cwd,
        startedAt: startedAt ?? new Date(),
        endedAt,
        durationMinutes,
        messages,
        toolCalls,
        errors,
        metadata: {
            cwd,
        },
    };
}
function extractTextFromBlocks(blocks) {
    return blocks
        .filter((b) => b.type === "text" && b.text)
        .map((b) => b.text)
        .join("\n");
}
//# sourceMappingURL=jsonl-parser.js.map