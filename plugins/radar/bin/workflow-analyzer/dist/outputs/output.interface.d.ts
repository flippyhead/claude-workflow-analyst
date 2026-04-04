import { Insight, ReportMetadata } from "../types/index.js";
export interface OutputTarget {
    name: string;
    publish(insights: Insight[], metadata: ReportMetadata): Promise<void>;
}
//# sourceMappingURL=output.interface.d.ts.map