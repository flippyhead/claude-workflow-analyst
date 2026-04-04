import { Insight, ReportMetadata } from "../types/insight.js";
import { OutputTarget } from "./output.interface.js";
export declare function formatMarkdownReport(insights: Insight[], metadata: ReportMetadata): string;
export declare class MarkdownOutput implements OutputTarget {
    name: string;
    private outputDir;
    constructor(outputDir: string);
    publish(insights: Insight[], metadata: ReportMetadata): Promise<void>;
}
//# sourceMappingURL=markdown.d.ts.map