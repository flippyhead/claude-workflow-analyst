import { ParsedSession } from "../types/session.js";
export interface ParseOptions {
    since: Date;
    until?: Date;
    projectFilter?: string[];
}
export interface Parser {
    name: string;
    canParse(path: string): boolean;
    parse(options: ParseOptions): Promise<ParsedSession[]>;
}
//# sourceMappingURL=parser.interface.d.ts.map