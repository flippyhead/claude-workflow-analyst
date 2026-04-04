export interface LLMOptions {
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
}
export interface LLMProvider {
    name: string;
    analyze(prompt: string, options?: LLMOptions): Promise<string>;
    analyzeStructured<T>(prompt: string, schema: Record<string, unknown>, options?: LLMOptions): Promise<T>;
}
//# sourceMappingURL=llm.interface.d.ts.map