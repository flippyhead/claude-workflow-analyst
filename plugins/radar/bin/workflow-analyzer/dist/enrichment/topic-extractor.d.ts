import { ParsedSession } from "../types/session.js";
export interface TopicResult {
    topic: string;
    category: string;
    confidence: number;
}
export declare function extractTopic(session: ParsedSession): TopicResult;
//# sourceMappingURL=topic-extractor.d.ts.map