import { Parser, ParseOptions } from "./parsers/parser.interface.js";
import { Analyzer } from "./analyzers/analyzer.interface.js";
import { OutputTarget } from "./outputs/output.interface.js";
import { LLMProvider } from "./llm/llm.interface.js";
import { Config, AnalyzerState } from "./types/config.js";
import { ParsedSession, SessionGroup } from "./types/session.js";
import { Insight, ReportMetadata } from "./types/insight.js";
import { extractTopic } from "./enrichment/topic-extractor.js";
import { linkSessions } from "./enrichment/session-linker.js";
import { prioritize } from "./prioritizer.js";
import { deduplicate, updateState } from "./deduplicator.js";
import { ParseCache } from "./cache.js";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

interface PipelineOptions {
  parsers: Parser[];
  analyzers: Analyzer[];
  outputs: OutputTarget[];
  llm: LLMProvider;
  config: Config;
}

interface PipelineResult {
  insights: Insight[];
  metadata: ReportMetadata;
  sessionCount: number;
}

const STATE_DIR = join(homedir(), ".workflow-analyzer");
const STATE_FILE = join(STATE_DIR, "state.json");

export class Pipeline {
  private parsers: Parser[];
  private analyzers: Analyzer[];
  private outputs: OutputTarget[];
  private llm: LLMProvider;
  private config: Config;

  constructor(options: PipelineOptions) {
    this.parsers = options.parsers;
    this.analyzers = options.analyzers;
    this.outputs = options.outputs;
    this.llm = options.llm;
    this.config = options.config;
  }

  async run(): Promise<PipelineResult> {
    const since = new Date();
    since.setDate(since.getDate() - this.config.analysis.lookbackDays);
    const until = new Date();

    // 1. Parse
    const parseOptions: ParseOptions = { since, until };
    const allSessions: ParsedSession[] = [];

    for (const parser of this.parsers) {
      try {
        const sessions = await parser.parse(parseOptions);
        allSessions.push(...sessions);
      } catch (err) {
        console.error(`Parser ${parser.name} failed:`, err);
      }
    }

    // 2. Enrich
    for (const session of allSessions) {
      const topicResult = extractTopic(session);
      session.topic = topicResult.topic;
      session.category = topicResult.category;
    }

    const sessionGroups = linkSessions(allSessions);

    // 3. Analyze (all modules in parallel)
    const insightPromises = this.analyzers.map((analyzer) =>
      analyzer.analyze({
        sessions: allSessions,
        sessionGroups,
        llm: this.llm,
      }).catch((err) => {
        console.error(`Analyzer ${analyzer.name} failed:`, err);
        return [] as Insight[];
      })
    );

    const insightArrays = await Promise.all(insightPromises);
    let insights = insightArrays.flat();

    // 4. Prioritize
    insights = prioritize(insights, {
      max: this.config.analysis.maxInsightsPerModule * Math.max(this.analyzers.length, 1),
      confidenceThreshold: this.config.analysis.confidenceThreshold,
    });

    // 5. Deduplicate
    const state = await this.loadState();
    insights = deduplicate(insights, state);

    // 6. Output
    const metadata: ReportMetadata = {
      period: { since, until },
      sessionCount: allSessions.length,
      sources: [...new Set(allSessions.map((s) => s.source))],
      modulesRun: this.analyzers.map((a) => a.name),
    };

    for (const output of this.outputs) {
      await output.publish(insights, metadata).catch((err) => {
        console.error(`Output ${output.name} failed:`, err);
      });
    }

    // 7. Update state
    const newState = updateState(state, insights);
    await this.saveState(newState);

    return { insights, metadata, sessionCount: allSessions.length };
  }

  private async loadState(): Promise<AnalyzerState> {
    try {
      const raw = await readFile(STATE_FILE, "utf-8");
      return JSON.parse(raw);
    } catch {
      return {
        lastRun: new Date().toISOString(),
        insightHistory: [],
        parseCacheMeta: {
          parserVersion: "0.1.0",
          lastCacheClean: new Date().toISOString(),
        },
      };
    }
  }

  private async saveState(state: AnalyzerState): Promise<void> {
    await mkdir(STATE_DIR, { recursive: true });
    await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  }
}
