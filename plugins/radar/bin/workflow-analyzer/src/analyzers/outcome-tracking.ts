// Deferred: Module G — Outcome Tracking
// See docs/superpowers/specs/2026-03-18-workflow-analyzer-design.md § 8

import { Analyzer, AnalyzerInput, DataRequirements } from "./analyzer.interface.js";
import { Insight } from "../types/insight.js";

export class OutcomeTrackingAnalyzer implements Analyzer {
  name = "outcome-tracking";
  description = "Track whether AI outputs were actually used (not yet implemented)";

  dataRequirements: DataRequirements = {
    needsMessages: true,
    needsToolCalls: true,
    needsErrors: false,
    needsSessionGroups: true,
    needsHistory: false,
    needsExternalContext: false,
    lookbackDays: 7,
  };

  async analyze(_input: AnalyzerInput): Promise<Insight[]> {
    return [];
  }
}
