import { Analyzer, AnalyzerInput, DataRequirements } from "./analyzer.interface.js";
import { Insight } from "../types/insight.js";
export declare class CollaborationQualityAnalyzer implements Analyzer {
    name: string;
    description: string;
    dataRequirements: DataRequirements;
    analyze(_input: AnalyzerInput): Promise<Insight[]>;
}
//# sourceMappingURL=collaboration-quality.d.ts.map