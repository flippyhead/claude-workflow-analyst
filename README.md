# Workflow Analyst — Claude Code Plugin

Analyze your Claude Code and Cowork session history to surface actionable workflow insights.

## What it does

Parses your recent sessions across Claude Code and Cowork, then produces insights in four categories — each with a concrete action, not just a description:

- **Root Cause Diagnosis** — "Neon fails because your API key expired. Run `neon auth login`."
- **Direct Automation** — "You confirm Read 47 times/week. Here's a config to auto-approve it."
- **Decision Support** — "Already.dev is 28% of your time but not in your goals. Intentional?"
- **Knowledge Nudges** — "You asked about OAuth PKCE 3 times. Save this summary."

## How it works

The skill uses [`@ai-brain/workflow-analyzer`](https://github.com/flippyhead/workflow-analyzer) (installed automatically via npx) for session parsing and enrichment. Claude does the reasoning and insight generation in-session.

## Install

```bash
# Add the marketplace
/plugin marketplace add flippyhead/claude-workflow-analyst

# Install the plugin
/plugin install workflow-analyst@claude-workflow-analyst
```

## Usage

```
/workflow-analyst
/workflow-analyst --days 14
```

### Other skills

```
/brain-sync              # Sync current project context into AI Brain
/brain-sync --name myapp # Override auto-derived project name
```

## AI Brain Integration

If you have an [AI Brain](https://github.com/flippyhead/ai-brain) MCP server connected, insights are automatically published as structured reports with feedback controls (noted/done/dismissed). Dismissed insights are suppressed in future runs.

Without AI Brain, insights are output directly in the conversation.

## Supported Platforms

- Claude Code (`~/.claude/projects/`)
- Claude Desktop Cowork (`~/Library/Application Support/Claude/local-agent-mode-sessions/`)

## License

MIT
