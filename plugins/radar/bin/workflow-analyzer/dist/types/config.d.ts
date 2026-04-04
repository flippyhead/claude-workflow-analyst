export interface Config {
    sources: Record<string, SourceConfig>;
    analyzers: Record<string, boolean>;
    outputs: Record<string, OutputConfig>;
    llm: LLMConfig;
    privacy: PrivacyConfig;
    analysis: AnalysisConfig;
}
export interface SourceConfig {
    enabled: boolean;
    path: string;
}
export interface OutputConfig {
    enabled: boolean;
    endpoint?: string;
    path?: string;
}
export interface LLMConfig {
    provider: string;
    model: string;
    apiKey?: string;
}
export interface PrivacyConfig {
    level: "full" | "metadata-only" | "local-only";
}
export interface AnalysisConfig {
    lookbackDays: number;
    maxInsightsPerModule: number;
    confidenceThreshold: number;
}
export interface AnalyzerState {
    lastRun: string;
    insightHistory: InsightHistoryEntry[];
    parseCacheMeta: {
        parserVersion: string;
        lastCacheClean: string;
    };
}
export interface InsightHistoryEntry {
    deduplicationKey: string;
    firstSeen: string;
    lastSeen: string;
    timesSurfaced: number;
    userFeedback?: "noted" | "done" | "dismissed";
    dismissCount: number;
}
//# sourceMappingURL=config.d.ts.map