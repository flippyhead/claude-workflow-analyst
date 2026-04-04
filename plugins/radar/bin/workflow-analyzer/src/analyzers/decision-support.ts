import { Analyzer, AnalyzerInput, DataRequirements } from "./analyzer.interface.js";
import { Insight } from "../types/insight.js";
import { SessionGroup } from "../types/session.js";

export class DecisionSupportAnalyzer implements Analyzer {
  name = "decision-support";
  description = "Compares AI time allocation against stated goals and priorities";

  dataRequirements: DataRequirements = {
    needsMessages: true,
    needsToolCalls: false,
    needsErrors: false,
    needsSessionGroups: true,
    needsHistory: false,
    needsExternalContext: true,
    lookbackDays: 7,
  };

  async analyze(input: AnalyzerInput): Promise<Insight[]> {
    if (input.sessionGroups.length === 0) return [];

    const totalSessions = input.sessionGroups.reduce((sum, g) => sum + g.sessionCount, 0);
    const totalMinutes = input.sessionGroups.reduce((sum, g) => sum + g.totalDurationMinutes, 0);

    // Build allocation summary
    const allocation = input.sessionGroups.map((g) => ({
      topic: g.topic,
      category: g.category,
      sessions: g.sessionCount,
      percentage: Math.round((g.sessionCount / totalSessions) * 100),
      minutes: Math.round(g.totalDurationMinutes),
      platforms: g.platforms,
    }));

    const goals = input.externalContext?.goals ?? [];

    const prompt = `Analyze this AI time allocation against the user's goals and produce actionable insights.

## Time Allocation (last 7 days)
Total: ${totalSessions} sessions, ${Math.round(totalMinutes)} minutes

${allocation.map((a) => `- **${a.topic}** (${a.category}): ${a.sessions} sessions (${a.percentage}%), ${a.minutes} min, platforms: ${a.platforms.join(", ")}`).join("\n")}

## User's Stated Goals
${goals.length > 0 ? goals.map((g) => `- ${g}`).join("\n") : "No goals specified — focus on time distribution patterns."}

## What to analyze:
1. Are there misalignments between time spent and stated goals?
2. Is any project consuming a disproportionate amount of time?
3. Are there cross-platform patterns (e.g., researching in Cowork but implementing in Claude Code)?
4. Any notable shifts or trends?

Respond with a JSON array of insights. Each must have:
- module: "decision-support"
- severity: "suggestion" or "action"
- title, observation, diagnosis (optional)
- action: prefer { type: "decide", question: "...", options: ["...", "..."] } for allocation questions
- evidence, effort, impact, confidence, deduplicationKey

Return [] if no meaningful insights. Max 3 insights.`;

    try {
      const insights = await input.llm.analyzeStructured<Insight[]>(prompt, { type: "array" });
      if (!Array.isArray(insights)) return [];
      return insights.map((i) => ({ ...i, module: this.name }));
    } catch {
      // Fallback: generate basic allocation insight
      if (allocation.length >= 2 && allocation[0].percentage > 40) {
        return [{
          module: this.name,
          severity: "info",
          title: `${allocation[0].topic} dominates at ${allocation[0].percentage}%`,
          observation: `${allocation[0].topic} consumes ${allocation[0].percentage}% of your AI time (${allocation[0].sessions} sessions).`,
          action: {
            type: "review",
            summary: `Time allocation: ${allocation.slice(0, 5).map((a) => `${a.topic} ${a.percentage}%`).join(", ")}`,
            links: [],
          },
          evidence: allocation.map((a) => ({ metric: `${a.topic}: ${a.percentage}% (${a.sessions} sessions)` })),
          effort: "low",
          impact: "medium",
          confidence: 0.7,
          deduplicationKey: `decision:allocation:${allocation[0].topic}:${allocation[0].percentage}`,
        }];
      }
      return [];
    }
  }
}
