import { Analyzer, AnalyzerInput, DataRequirements } from "./analyzer.interface.js";
import { Insight } from "../types/insight.js";
export declare class DecisionSupportAnalyzer implements Analyzer {
    name: string;
    description: string;
    dataRequirements: DataRequirements;
    analyze(input: AnalyzerInput): Promise<Insight[]>;
}
//# sourceMappingURL=decision-support.d.ts.map