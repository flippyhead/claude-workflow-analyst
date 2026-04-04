import { ParsedSession } from "../types/session.js";
import { Parser, ParseOptions } from "./parser.interface.js";
export declare class CoworkParser implements Parser {
    readonly name = "cowork";
    private basePath;
    constructor(basePath: string);
    canParse(path: string): boolean;
    /**
     * Decode a cowork session directory name into a readable session name.
     * e.g. "-sessions-confident-great-sagan" -> "confident-great-sagan"
     */
    static decodeSessionName(encoded: string): string;
    /**
     * Deep directory traversal:
     * basePath/{orgId}/{workspaceId}/local_{id}/.claude/projects/{name}/*.jsonl
     */
    parse(options: ParseOptions): Promise<ParsedSession[]>;
    private traverseDirectory;
}
//# sourceMappingURL=cowork.d.ts.map