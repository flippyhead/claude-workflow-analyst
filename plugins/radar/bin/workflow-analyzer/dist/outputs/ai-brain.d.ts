import { Insight, ReportMetadata } from "../types/insight.js";
import { OutputTarget } from "./output.interface.js";
export declare class AIBrainOutput implements OutputTarget {
    name: string;
    private endpoint;
    constructor(endpoint: string);
    publish(insights: Insight[], metadata: ReportMetadata): Promise<void>;
}
//# sourceMappingURL=ai-brain.d.ts.map