import { Insight } from "./types/insight.js";
import { AnalyzerState } from "./types/config.js";
export declare function deduplicate(insights: Insight[], state: AnalyzerState): Insight[];
export declare function updateState(state: AnalyzerState, publishedInsights: Insight[]): AnalyzerState;
//# sourceMappingURL=deduplicator.d.ts.map