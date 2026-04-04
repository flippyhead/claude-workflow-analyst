import { Analyzer, AnalyzerInput, DataRequirements } from "./analyzer.interface.js";
import { Insight } from "../types/insight.js";
export declare class RootCauseAnalyzer implements Analyzer {
    name: string;
    description: string;
    dataRequirements: DataRequirements;
    analyze(input: AnalyzerInput): Promise<Insight[]>;
}
//# sourceMappingURL=root-cause.d.ts.map