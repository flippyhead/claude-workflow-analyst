const CATEGORY_KEYWORDS = [
    {
        category: "writing",
        keywords: [
            "write", "draft", "email", "blog", "post", "letter", "document",
            "article", "essay", "copy", "content", "message", "memo", "report",
            "summarize", "summary", "proofread", "edit text", "rewrite",
        ],
    },
    {
        category: "research",
        keywords: [
            "search", "find", "research", "look up", "investigate", "compare",
            "analyze", "what is", "how does", "explain", "learn about",
            "approaches to", "best practices", "alternatives",
        ],
    },
    {
        category: "development",
        keywords: [
            "code", "function", "bug", "fix", "implement", "refactor", "test",
            "deploy", "build", "api", "database", "component", "module",
            "typescript", "javascript", "python", "react", "css", "html",
            "git", "commit", "pull request", "merge",
        ],
    },
    {
        category: "planning",
        keywords: [
            "plan", "schedule", "organize", "prioritize", "roadmap", "strategy",
            "timeline", "milestone", "goal", "objective", "budget", "estimate",
            "project plan", "task list", "breakdown",
        ],
    },
    {
        category: "data",
        keywords: [
            "data", "csv", "spreadsheet", "chart", "graph", "statistics",
            "calculate", "numbers", "metrics", "dashboard", "visualization",
            "analysis", "dataset", "transform",
        ],
    },
    {
        category: "design",
        keywords: [
            "design", "layout", "ui", "ux", "wireframe", "mockup", "prototype",
            "color", "font", "style", "interface", "visual", "figma", "sketch",
        ],
    },
];
export function extractTopic(session) {
    // For claude-code sessions, the project name IS the topic
    if (session.source === "claude-code" && session.project) {
        return {
            topic: session.project,
            category: "development",
            confidence: 0.9,
        };
    }
    // For cowork sessions, analyze message content with keyword scoring
    const userMessages = session.messages
        .filter((m) => m.role === "user")
        .map((m) => m.content.toLowerCase());
    const allText = userMessages.join(" ");
    if (!allText.trim()) {
        return {
            topic: session.project ?? "unknown",
            category: "general",
            confidence: 0.1,
        };
    }
    // Score each category
    const scores = CATEGORY_KEYWORDS.map(({ category, keywords }) => {
        let score = 0;
        for (const keyword of keywords) {
            if (allText.includes(keyword)) {
                score += 1;
            }
        }
        return { category, score };
    });
    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    const bestMatch = scores[0];
    if (bestMatch.score === 0) {
        return {
            topic: session.project ?? extractTopicFromText(allText),
            category: "general",
            confidence: 0.2,
        };
    }
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const confidence = Math.min(0.9, bestMatch.score / Math.max(totalScore, 1));
    return {
        topic: session.project ?? extractTopicFromText(allText),
        category: bestMatch.category,
        confidence,
    };
}
/**
 * Extract a short topic phrase from message text.
 * Takes the first few meaningful words from the first user message.
 */
function extractTopicFromText(text) {
    const words = text.split(/\s+/).slice(0, 6);
    const topic = words.join(" ");
    return topic.length > 50 ? topic.substring(0, 50) + "..." : topic;
}
//# sourceMappingURL=topic-extractor.js.map