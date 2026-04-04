import { LLMProvider, LLMOptions } from "../../src/llm/llm.interface.js";

interface MockRule {
  substring: string;
  response: string;
}

export class MockLLMProvider implements LLMProvider {
  name = "mock";
  private rules: MockRule[] = [];
  calls: { prompt: string; options?: LLMOptions }[] = [];

  onPromptContaining(substring: string, response: string): void {
    this.rules.push({ substring, response });
  }

  async analyze(prompt: string, options?: LLMOptions): Promise<string> {
    this.calls.push({ prompt, options });
    const rule = this.rules.find((r) => prompt.includes(r.substring));
    if (rule) return rule.response;
    return '{"fallback": true}';
  }

  async analyzeStructured<T>(
    prompt: string,
    schema: Record<string, unknown>,
    options?: LLMOptions
  ): Promise<T> {
    const raw = await this.analyze(prompt, options);
    return JSON.parse(raw) as T;
  }
}
