import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { ParsedSession } from "./types/session.js";

interface CacheEntry {
  mtime: number;
  sessions: ParsedSession[];
}

export class ParseCache {
  private store = new Map<string, CacheEntry>();
  private filePath?: string;

  constructor(filePath?: string) {
    this.filePath = filePath;
  }

  get(path: string, mtime: number): ParsedSession[] | null {
    const entry = this.store.get(path);
    if (!entry || entry.mtime !== mtime) return null;
    return entry.sessions;
  }

  set(path: string, mtime: number, sessions: ParsedSession[]): void {
    this.store.set(path, { mtime, sessions });
  }

  clear(): void {
    this.store.clear();
  }

  load(): void {
    if (!this.filePath) return;
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      const entries: [string, CacheEntry][] = JSON.parse(raw);
      this.store = new Map(entries);
    } catch {
      // File doesn't exist or is corrupt — start fresh
    }
  }

  save(): void {
    if (!this.filePath) return;
    try {
      mkdirSync(dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify([...this.store.entries()]));
    } catch {
      // Non-fatal — cache is optional
    }
  }
}
