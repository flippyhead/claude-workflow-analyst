import { LLMProvider, LLMOptions } from "./llm.interface.js";
export declare class ClaudeApiProvider implements LLMProvider {
    name: string;
    private client;
    private model;
    constructor(options?: {
        apiKey?: string;
        model?: string;
    });
    analyze(prompt: string, options?: LLMOptions): Promise<string>;
    analyzeStructured<T>(prompt: string, schema: Record<string, unknown>, options?: LLMOptions): Promise<T>;
}
//# sourceMappingURL=claude-api.d.ts.map