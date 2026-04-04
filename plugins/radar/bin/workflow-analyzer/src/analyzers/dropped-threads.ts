// Deferred: Module E — Dropped Threads
// Track unfinished work across sessions.
// See docs/superpowers/specs/2026-03-18-workflow-analyzer-design.md § 8

import { Analyzer, AnalyzerInput, DataRequirements } from "./analyzer.interface.js";
import { Insight } from "../types/insight.js";

export class DroppedThreadsAnalyzer implements Analyzer {
  name = "dropped-threads";
  description = "Track unfinished work across sessions (not yet implemented)";

  dataRequirements: DataRequirements = {
    needsMessages: true,
    needsToolCalls: false,
    needsErrors: false,
    needsSessionGroups: true,
    needsHistory: true,
    needsExternalContext: false,
    lookbackDays: 14,
  };

  async analyze(_input: AnalyzerInput): Promise<Insight[]> {
    return []; // Not yet implemented
  }
}
