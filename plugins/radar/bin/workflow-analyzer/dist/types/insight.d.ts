export interface Insight {
    module: string;
    severity: "info" | "suggestion" | "action" | "alert";
    title: string;
    observation: string;
    diagnosis?: string;
    action: Action;
    evidence: Evidence[];
    effort: "low" | "medium" | "high";
    impact: "low" | "medium" | "high";
    confidence: number;
    deduplicationKey: string;
}
export type Action = {
    type: "install";
    artifact: string;
    content: string;
} | {
    type: "run";
    command: string;
    explanation: string;
} | {
    type: "save";
    content: string;
    destination: string;
} | {
    type: "review";
    summary: string;
    links: string[];
} | {
    type: "decide";
    question: string;
    options: string[];
} | {
    type: "acknowledge";
    message: string;
};
export interface Evidence {
    metric?: string;
    sessions?: string[];
    snippet?: string;
}
export interface ReportMetadata {
    period: {
        since: Date;
        until: Date;
    };
    sessionCount: number;
    sources: string[];
    modulesRun: string[];
}
//# sourceMappingURL=insight.d.ts.map