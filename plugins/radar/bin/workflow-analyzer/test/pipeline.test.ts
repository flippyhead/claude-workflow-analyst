import { describe, it, expect, vi } from "vitest";
import { Pipeline } from "../src/pipeline.js";
import { MockLLMProvider } from "./helpers/mock-llm.js";

describe("Pipeline", () => {
  it("runs the full pipeline with mock data", async () => {
    const llm = new MockLLMProvider();
    // Return empty arrays for all LLM calls
    llm.onPromptContaining("", "[]");

    const pipeline = new Pipeline({
      parsers: [],
      analyzers: [],
      outputs: [],
      llm,
      config: {
        sources: {},
        analyzers: {},
        outputs: {},
        llm: { provider: "mock", model: "test" },
        privacy: { level: "full" },
        analysis: {
          lookbackDays: 7,
          maxInsightsPerModule: 5,
          confidenceThreshold: 0.6,
        },
      },
    });

    const result = await pipeline.run();
    expect(result).toBeDefined();
    expect(result.insights).toBeInstanceOf(Array);
    expect(result.metadata).toBeDefined();
  });
});
