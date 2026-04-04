import { ParsedSession } from "./types/session.js";
export declare class ParseCache {
    private store;
    private filePath?;
    constructor(filePath?: string);
    get(path: string, mtime: number): ParsedSession[] | null;
    set(path: string, mtime: number, sessions: ParsedSession[]): void;
    clear(): void;
    load(): void;
    save(): void;
}
//# sourceMappingURL=cache.d.ts.map