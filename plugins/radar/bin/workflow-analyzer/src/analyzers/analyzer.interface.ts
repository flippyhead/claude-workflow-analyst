import { ParsedSession, SessionGroup } from "../types/session.js";
import { Insight } from "../types/insight.js";
import { LLMProvider } from "../llm/llm.interface.js";

export interface DataRequirements {
  needsMessages: boolean;
  needsToolCalls: boolean;
  needsErrors: boolean;
  needsSessionGroups: boolean;
  needsHistory: boolean;
  needsExternalContext: boolean;
  lookbackDays: number;
}

export interface AnalyzerInput {
  sessions: ParsedSession[];
  sessionGroups: SessionGroup[];
  previousInsights?: Insight[];
  externalContext?: {
    goals?: string[];
    previousReports?: string[];
  };
  llm: LLMProvider;
}

export interface Analyzer {
  name: string;
  description: string;
  dataRequirements: DataRequirements;
  analyze(input: AnalyzerInput): Promise<Insight[]>;
}
