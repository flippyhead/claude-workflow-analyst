import { LLMProvider, LLMOptions } from "./llm.interface.js";
export declare class ClaudeCodeRuntimeProvider implements LLMProvider {
    name: string;
    analyze(prompt: string, _options?: LLMOptions): Promise<string>;
    analyzeStructured<T>(_prompt: string, _schema: Record<string, unknown>, _options?: LLMOptions): Promise<T>;
}
//# sourceMappingURL=claude-code-runtime.d.ts.map