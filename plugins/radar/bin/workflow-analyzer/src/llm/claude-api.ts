import Anthropic from "@anthropic-ai/sdk";
import { LLMProvider, LLMOptions } from "./llm.interface.js";

export class ClaudeApiProvider implements LLMProvider {
  name = "claude-api";
  private client: Anthropic;
  private model: string;

  constructor(options: { apiKey?: string; model?: string } = {}) {
    this.client = new Anthropic({
      apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
    this.model = options.model ?? "claude-sonnet-4-20250514";
  }

  async analyze(prompt: string, options: LLMOptions = {}): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens ?? 4096,
      ...(options.systemPrompt ? { system: options.systemPrompt } : {}),
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock ? textBlock.text : "";
  }

  async analyzeStructured<T>(
    prompt: string,
    schema: Record<string, unknown>,
    options: LLMOptions = {}
  ): Promise<T> {
    const structuredPrompt = `${prompt}\n\nRespond with ONLY valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`;

    const raw = await this.analyze(structuredPrompt, options);

    // Extract JSON from response (handles markdown code blocks)
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
    const jsonStr = (jsonMatch[1] ?? raw).trim();

    return JSON.parse(jsonStr) as T;
  }
}
