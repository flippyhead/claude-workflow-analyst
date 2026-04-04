import Anthropic from "@anthropic-ai/sdk";
export class ClaudeApiProvider {
    name = "claude-api";
    client;
    model;
    constructor(options = {}) {
        this.client = new Anthropic({
            apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY,
        });
        this.model = options.model ?? "claude-sonnet-4-20250514";
    }
    async analyze(prompt, options = {}) {
        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: options.maxTokens ?? 4096,
            ...(options.systemPrompt ? { system: options.systemPrompt } : {}),
            messages: [{ role: "user", content: prompt }],
        });
        const textBlock = response.content.find((block) => block.type === "text");
        return textBlock ? textBlock.text : "";
    }
    async analyzeStructured(prompt, schema, options = {}) {
        const structuredPrompt = `${prompt}\n\nRespond with ONLY valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`;
        const raw = await this.analyze(structuredPrompt, options);
        // Extract JSON from response (handles markdown code blocks)
        const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
        const jsonStr = (jsonMatch[1] ?? raw).trim();
        return JSON.parse(jsonStr);
    }
}
//# sourceMappingURL=claude-api.js.map