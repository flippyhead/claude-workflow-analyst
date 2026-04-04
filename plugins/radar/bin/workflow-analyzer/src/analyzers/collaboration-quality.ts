// Deferred: Module F — Collaboration Quality
// See docs/superpowers/specs/2026-03-18-workflow-analyzer-design.md § 8

import { Analyzer, AnalyzerInput, DataRequirements } from "./analyzer.interface.js";
import { Insight } from "../types/insight.js";

export class CollaborationQualityAnalyzer implements Analyzer {
  name = "collaboration-quality";
  description = "Analyze how effectively the user works with AI (not yet implemented)";

  dataRequirements: DataRequirements = {
    needsMessages: true,
    needsToolCalls: true,
    needsErrors: false,
    needsSessionGroups: false,
    needsHistory: false,
    needsExternalContext: false,
    lookbackDays: 7,
  };

  async analyze(_input: AnalyzerInput): Promise<Insight[]> {
    return [];
  }
}
