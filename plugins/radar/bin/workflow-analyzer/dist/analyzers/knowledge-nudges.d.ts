import { Analyzer, AnalyzerInput, DataRequirements } from "./analyzer.interface.js";
import { Insight } from "../types/insight.js";
export declare class KnowledgeNudgesAnalyzer implements Analyzer {
    name: string;
    description: string;
    dataRequirements: DataRequirements;
    analyze(input: AnalyzerInput): Promise<Insight[]>;
}
//# sourceMappingURL=knowledge-nudges.d.ts.map