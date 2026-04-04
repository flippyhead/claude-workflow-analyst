import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
export class ParseCache {
    store = new Map();
    filePath;
    constructor(filePath) {
        this.filePath = filePath;
    }
    get(path, mtime) {
        const entry = this.store.get(path);
        if (!entry || entry.mtime !== mtime)
            return null;
        return entry.sessions;
    }
    set(path, mtime, sessions) {
        this.store.set(path, { mtime, sessions });
    }
    clear() {
        this.store.clear();
    }
    load() {
        if (!this.filePath)
            return;
        try {
            const raw = readFileSync(this.filePath, "utf-8");
            const entries = JSON.parse(raw);
            this.store = new Map(entries);
        }
        catch {
            // File doesn't exist or is corrupt — start fresh
        }
    }
    save() {
        if (!this.filePath)
            return;
        try {
            mkdirSync(dirname(this.filePath), { recursive: true });
            writeFileSync(this.filePath, JSON.stringify([...this.store.entries()]));
        }
        catch {
            // Non-fatal — cache is optional
        }
    }
}
//# sourceMappingURL=cache.js.map