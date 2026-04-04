import { Analyzer, AnalyzerInput, DataRequirements } from "./analyzer.interface.js";
import { Insight } from "../types/insight.js";
export declare class DirectAutomationAnalyzer implements Analyzer {
    name: string;
    description: string;
    dataRequirements: DataRequirements;
    analyze(input: AnalyzerInput): Promise<Insight[]>;
    private detectConfirmations;
    private detectRepeatedPrompts;
    private detectRepeatedSequences;
}
//# sourceMappingURL=direct-automation.d.ts.map