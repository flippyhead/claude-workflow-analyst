import { Parser } from "./parsers/parser.interface.js";
import { Analyzer } from "./analyzers/analyzer.interface.js";
import { OutputTarget } from "./outputs/output.interface.js";
import { LLMProvider } from "./llm/llm.interface.js";
import { Config } from "./types/config.js";
import { Insight, ReportMetadata } from "./types/insight.js";
interface PipelineOptions {
    parsers: Parser[];
    analyzers: Analyzer[];
    outputs: OutputTarget[];
    llm: LLMProvider;
    config: Config;
}
interface PipelineResult {
    insights: Insight[];
    metadata: ReportMetadata;
    sessionCount: number;
}
export declare class Pipeline {
    private parsers;
    private analyzers;
    private outputs;
    private llm;
    private config;
    constructor(options: PipelineOptions);
    run(): Promise<PipelineResult>;
    private loadState;
    private saveState;
}
export {};
//# sourceMappingURL=pipeline.d.ts.map