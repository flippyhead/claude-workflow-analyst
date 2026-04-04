import { Insight } from "./types/insight.js";
export interface PrioritizeOptions {
    confidenceThreshold?: number;
    max?: number;
}
export declare function prioritize(insights: Insight[], options?: PrioritizeOptions): Insight[];
//# sourceMappingURL=prioritizer.d.ts.map