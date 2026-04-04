import { ParsedSession } from "../types/session.js";
import { Parser, ParseOptions } from "./parser.interface.js";
export declare class ClaudeCodeParser implements Parser {
    readonly name = "claude-code";
    private basePath;
    constructor(basePath: string);
    canParse(path: string): boolean;
    /**
     * Decode an encoded project directory name into a human-readable project name.
     * e.g. "-Users-peterbrown-Development-ai-brain" -> "ai-brain"
     */
    static decodeProjectPath(encoded: string): string;
    parse(options: ParseOptions): Promise<ParsedSession[]>;
}
//# sourceMappingURL=claude-code.d.ts.map