# Radar Local-Only Refactor (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Radar a pristine standalone plugin — local JSON persistence only, no AI Brain references, new `/radar-review` conversational review skill, and a single-product README ready for public promotion.

**Architecture:** All four Radar skills switch from dual-mode (brain/local) to local-only, persisting to `~/.claude/radar/catalogue.json`. A new `/radar-review` skill provides conversational review (star, dismiss, annotate, filter). The workflow-analyzer's `AIBrainOutput` is removed. The radar plugin's `.mcp.json` is deleted. The README becomes a single-product pitch. The JSON catalogue schema is the stable contract for future adapter plugins.

**Tech Stack:** SKILL.md (structured prompts), Node.js ESM (hooks), TypeScript (workflow-analyzer)

---

## File Structure

```
plugins/radar/
  .mcp.json                              # DELETE
  skills/
    radar/SKILL.md                       # MODIFY — remove brain references
    radar-analyze/SKILL.md               # MODIFY — remove brain/MCP steps, local insights
    radar-scan/SKILL.md                  # MODIFY — remove brain mode, local-only
    radar-recommend/SKILL.md             # MODIFY — remove brain mode, local-only
    radar-review/SKILL.md               # CREATE — new conversational review skill
  hooks/
    first-run.mjs                        # MODIFY — update catalogue path
  bin/
    workflow-analyzer/
      src/cli.ts                         # MODIFY — remove AIBrainOutput
      src/index.ts                       # MODIFY — remove AIBrainOutput export
      src/outputs/ai-brain.ts            # DELETE
      src/analyzers/knowledge-nudges.ts  # MODIFY — change "AI Brain" destination
      config/default.yaml                # MODIFY — remove ai-brain output section
      dist/                              # REBUILD after changes
README.md                               # REWRITE
CLAUDE.md                               # MODIFY — remove brain-optional design notes
.claude-plugin/plugin.json               # MODIFY — version bump + description
.claude-plugin/marketplace.json          # MODIFY — version bump + description
plugins/radar/.claude-plugin/plugin.json # MODIFY — version bump
```

---

### Task 1: Define Catalogue Schema

Establish the JSON schema that all skills read/write and that future adapters will consume. This is the contract.

**Files:**
- Create: `plugins/radar/skills/radar-review/SKILL.md` (schema documented here, created fully in Task 7)

- [ ] **Step 1: Create the catalogue directory note**

No file to create yet — the schema is defined here and referenced by all subsequent tasks. The canonical catalogue path is `~/.claude/radar/catalogue.json`.

Schema:

```json
{
  "version": "1.0",
  "updatedAt": "2026-04-13T00:00:00.000Z",
  "items": [
    {
      "id": "sha256-first-12-chars-of-url",
      "title": "Human-readable title",
      "url": "https://...",
      "description": "1-2 sentence summary",
      "category": "claude-code|mcp|api|agent-sdk|prompting|tooling|workflow|general-ai",
      "tags": ["browser-automation", "testing"],
      "source": "hackernews|github|youtube|anthropic|dependency|manual",
      "discoveredAt": "2026-04-13T00:00:00.000Z",
      "status": "new|reviewed|starred|dismissed|acted-on",
      "notes": [
        { "at": "2026-04-13T...", "text": "User annotation" }
      ],
      "score": null,
      "scoreBreakdown": null,
      "reviewedAt": null,
      "lastRecommended": null
    }
  ],
  "insights": [
    {
      "id": "insight-uuid",
      "type": "recommendation|pattern|nudge",
      "observation": "What the data shows",
      "recommendation": "What to do",
      "evidence": ["specific data points"],
      "relatedItems": ["item-id-1"],
      "createdAt": "2026-04-13T...",
      "status": "new|reviewed|dismissed"
    }
  ]
}
```

Empty initial state:

```json
{
  "version": "1.0",
  "updatedAt": null,
  "items": [],
  "insights": []
}
```

- [ ] **Step 2: Document the schema as a reference comment at the top of radar-review SKILL.md**

This will be done in Task 7 when we create the review skill. For now, all subsequent tasks reference this schema.

---

### Task 2: Remove Radar `.mcp.json`

**Files:**
- Delete: `plugins/radar/.mcp.json`

- [ ] **Step 1: Delete the file**

```bash
rm plugins/radar/.mcp.json
```

- [ ] **Step 2: Verify no other file references this path**

```bash
grep -r "\.mcp\.json" plugins/radar/ --include="*.mjs" --include="*.json" --include="*.md"
```

Expected: No matches within the radar plugin (CLAUDE.md at root may mention it — that's updated in Task 11).

- [ ] **Step 3: Commit**

```bash
git add -u plugins/radar/.mcp.json
git commit -m "chore(radar): remove ai-brain MCP server declaration"
```

---

### Task 3: Remove AIBrainOutput from Workflow Analyzer

**Files:**
- Delete: `plugins/radar/bin/workflow-analyzer/src/outputs/ai-brain.ts`
- Modify: `plugins/radar/bin/workflow-analyzer/src/cli.ts`
- Modify: `plugins/radar/bin/workflow-analyzer/src/index.ts`
- Modify: `plugins/radar/bin/workflow-analyzer/src/analyzers/knowledge-nudges.ts`
- Modify: `plugins/radar/bin/workflow-analyzer/config/default.yaml`

- [ ] **Step 1: Delete ai-brain.ts**

```bash
rm plugins/radar/bin/workflow-analyzer/src/outputs/ai-brain.ts
```

- [ ] **Step 2: Remove AIBrainOutput import and usage from cli.ts**

In `plugins/radar/bin/workflow-analyzer/src/cli.ts`, remove:
- Line 17: `import { AIBrainOutput } from "./outputs/ai-brain.js";`
- Lines 205-206: the `if (outputConfig["ai-brain"]...)` block in `buildOutputs()`

- [ ] **Step 3: Remove AIBrainOutput export from index.ts**

In `plugins/radar/bin/workflow-analyzer/src/index.ts`, remove:
- Line 11: `export { AIBrainOutput } from "./outputs/ai-brain.js";`

- [ ] **Step 4: Update knowledge-nudges.ts destination**

In `plugins/radar/bin/workflow-analyzer/src/analyzers/knowledge-nudges.ts`, change line 56:

From:
```
- action: { type: "save", content: "consolidated summary of what to save", destination: "AI Brain — reference" }
```

To:
```
- action: { type: "save", content: "consolidated summary of what to save", destination: "CLAUDE.md or project memory" }
```

- [ ] **Step 5: Remove ai-brain output section from default.yaml**

In `plugins/radar/bin/workflow-analyzer/config/default.yaml`, remove lines 19-21:

```yaml
  ai-brain:
    enabled: false
    endpoint: "http://localhost:3577"
```

- [ ] **Step 6: Run existing tests**

```bash
cd plugins/radar/bin/workflow-analyzer && npm test
```

Expected: All tests pass. If any test imports AIBrainOutput or references "ai-brain", update or remove that test.

- [ ] **Step 7: Rebuild dist/**

```bash
cd plugins/radar/bin/workflow-analyzer && npm run build
```

- [ ] **Step 8: Delete stale dist files**

```bash
rm -f plugins/radar/bin/workflow-analyzer/dist/outputs/ai-brain.js
rm -f plugins/radar/bin/workflow-analyzer/dist/outputs/ai-brain.js.map
rm -f plugins/radar/bin/workflow-analyzer/dist/outputs/ai-brain.d.ts
rm -f plugins/radar/bin/workflow-analyzer/dist/outputs/ai-brain.d.ts.map
```

- [ ] **Step 9: Commit**

```bash
git add plugins/radar/bin/workflow-analyzer/
git commit -m "feat(radar): remove AIBrainOutput from workflow-analyzer"
```

---

### Task 4: Refactor radar-scan Skill to Local-Only

**Files:**
- Modify: `plugins/radar/skills/radar-scan/SKILL.md`

This is the most complex skill refactor. Currently has "brain mode" and "local mode" branches throughout. Replace with local-only.

- [ ] **Step 1: Rewrite radar-scan SKILL.md**

Replace the entire file with the following content. Key changes:
- Step 1 ("Check/Create Catalogue Lists") becomes "Load or Initialize Catalogue" — reads `~/.claude/radar/catalogue.json`, creates empty if missing, migrates from old paths
- Step 2 ("Load Existing Catalogue") merges into Step 1
- All "Brain mode:" / "Local mode:" branches replaced with single local path
- Step 4 ("Process Inbox Items") simplified — inbox items are items in catalogue with `source: "manual"` and `status: "new"`
- Step 5 ("Enrich and Tag") writes directly to catalogue JSON
- Step 6 ("Report") terminal output only, no brain reference

```markdown
---
name: radar-scan
description: Scan external sources for AI tools, features, and techniques. Builds a discovery catalogue from dependency changelogs, HN, GitHub, YouTube, and your inbox.
argument-hint: [--sources <all|feeds|manual>] [--days N]
---

# Radar Scan — Discovery Catalogue Builder

Build and maintain a catalogue of AI tools, features, and techniques from external sources.

## Arguments

- `$ARGUMENTS` — Optional:
  - `--sources <all|feeds|manual>` — Which sources to scan (default: all)
  - `--days N` — How far back to look in time-based sources (default: 7)

Parse from `$ARGUMENTS` if provided. Default to `--sources all --days 7`.

## Workflow

### Step 1: Load or Initialize Catalogue

Read `~/.claude/radar/catalogue.json`. If it doesn't exist:

1. Check for legacy paths and migrate if found:
   - `~/.claude/radar-catalogue.json` → move to `~/.claude/radar/catalogue.json`
   - `~/.claude/scout-catalogue.json` → move to `~/.claude/radar/catalogue.json`
2. If no legacy file exists, initialize with empty structure:

```json
{
  "version": "1.0",
  "updatedAt": null,
  "items": [],
  "insights": []
}
```

Create the `~/.claude/radar/` directory if it doesn't exist.

Build a set of known URLs from existing items for deduplication.

### Step 2: Scan Project Dependencies

Run `node "${CLAUDE_PLUGIN_ROOT}/bin/workflow-analyzer/dist/cli.js" scan-deps --since ${DAYS} --output /tmp/workflow-analyzer-deps.json`. Read the output JSON. If the bundled binary is not available, fall back to `npx @flippyhead/workflow-analyzer@latest scan-deps --since ${DAYS} --output /tmp/workflow-analyzer-deps.json`.

If the command fails or is not available, log a warning and skip to Step 3 — dependency scanning is additive, not required.

If `GITHUB_TOKEN` is not set in the environment and the scan-deps output shows `rateLimited > 0`, print: "GitHub API rate limited — scanned [reposResolved] of [packageCount] dependencies. Set GITHUB_TOKEN for full scanning."

For each entry in the `releases` array:
1. Read the `release.body` (release notes) and `repoDescription` to assess relevance
2. **Skip** routine releases: patch version bumps, typo fixes, minor dep updates, internal refactors, CI/CD changes, documentation-only releases
3. **Catalogue** interesting releases: new CLI tools, MCP servers/integrations, AI/agent features, breaking changes, significant new APIs, performance improvements
4. Create catalogue items using the standard enrichment from Step 5, with `source: "dependency"` and tag `"direct-dependency"`
5. Use the `release.url` as the item URL for deduplication against existing catalogue

### Step 3: Scan Structured Sources

Skip this step if `--sources manual` was specified.

Limit to **10-15 items per source**. If a source fails (timeout, rate limit, format change), log a warning and continue to the next source — never fail the entire run.

When a source fails, print a clear one-line message: "Source [name] unavailable: [reason]. Continuing with remaining sources."

**Anthropic changelog/blog:**
Use `WebFetch` on `https://docs.anthropic.com/en/docs/about-claude/models` and `https://www.anthropic.com/news` to find recent releases and feature announcements. Extract title, URL, and a one-line description for each.

**Hacker News:**
Use `WebFetch` on the Algolia API:
- `https://hn.algolia.com/api/v1/search_by_date?query=claude+code&tags=story&numericFilters=created_at_i>${DAYS_AGO_TIMESTAMP}`
- `https://hn.algolia.com/api/v1/search_by_date?query=anthropic+mcp&tags=story&numericFilters=created_at_i>${DAYS_AGO_TIMESTAMP}`
- `https://hn.algolia.com/api/v1/search_by_date?query=ai+agent+tool&tags=story&numericFilters=created_at_i>${DAYS_AGO_TIMESTAMP}`

Extract title, URL (use `url` field, fall back to HN comment URL), and points as a quality signal. Only keep items with 5+ points.

**GitHub:**
Use `WebSearch` for:
- "new MCP server" site:github.com (last N days)
- "claude code plugin" site:github.com (last N days)

Extract repo name, URL, and description.

**YouTube:**
Use `WebSearch` for:
- "claude code tutorial" (last N days)
- "anthropic MCP" tutorial (last N days)

Extract video title, URL, and channel name.

For each result across all sources: skip if the URL already exists in the catalogue (deduplication).

Also deduplicate across sources within this run — if the same URL was found by both HN and GitHub in this run, only catalogue it once.

### Step 4: Process Manual Inbox Items

Skip this step if `--sources feeds` was specified.

Look for items in the catalogue with `source: "manual"` and `status: "new"`. For each:

1. If the item has a URL, use `WebFetch` to get the page content
2. Summarize what it is and why it might be useful (1-2 sentences) — update `description`
3. Classify it (see Step 5 for category/tag schema)
4. Update category and tags on the existing item
5. Set `status: "reviewed"` and `reviewedAt` to now

### Step 5: Enrich and Tag

For each new catalogue entry (from Step 2 or Step 3), create an item object:

```json
{
  "id": "<first 12 chars of SHA-256 hash of the URL>",
  "title": "...",
  "url": "...",
  "description": "1-2 sentence summary",
  "category": "<one of: claude-code, mcp, api, agent-sdk, prompting, tooling, workflow, general-ai>",
  "tags": ["<free-text tags describing what workflows/goals this helps with>"],
  "source": "<one of: anthropic, hackernews, github, youtube, manual, dependency>",
  "discoveredAt": "<ISO date>",
  "status": "new",
  "notes": [],
  "score": null,
  "scoreBreakdown": null,
  "reviewedAt": null,
  "lastRecommended": null
}
```

Choose category based on the content:
- `claude-code` — Claude Code features, settings, shortcuts, plugins
- `mcp` — MCP servers, protocols, integrations
- `api` — Claude API features, SDK updates
- `agent-sdk` — Agent building tools and frameworks
- `prompting` — Prompting techniques, system prompts, skill design
- `tooling` — Developer tools, CLI utilities, browser extensions
- `workflow` — Workflow patterns, automation techniques, productivity methods
- `general-ai` — Broader AI developments, models, research

Append each new item to the catalogue's `items` array. Update `updatedAt` to now. Write the catalogue back to `~/.claude/radar/catalogue.json`.

### Step 6: Report

Output a brief terminal summary:
- How many new items were catalogued, by source
- How many inbox items were processed
- How many duplicates were skipped
- The 3-5 most notable new finds (title + one-line description)
- Total catalogue size
```

- [ ] **Step 2: Verify the skill file is valid SKILL.md frontmatter**

Check that the `---` frontmatter block is intact and `name`, `description`, `argument-hint` are present.

- [ ] **Step 3: Commit**

```bash
git add plugins/radar/skills/radar-scan/SKILL.md
git commit -m "feat(radar): refactor radar-scan to local-only persistence"
```

---

### Task 5: Refactor radar-recommend Skill to Local-Only

**Files:**
- Modify: `plugins/radar/skills/radar-recommend/SKILL.md`

- [ ] **Step 1: Rewrite radar-recommend SKILL.md**

Key changes:
- Step 1 ("Load the Catalogue") becomes local-only — reads `~/.claude/radar/catalogue.json`
- Step 2 ("Load Personal Context") removes brain goals/thoughts, keeps session history + environment scanning
- Step 5 ("Publish as Insights") writes to the catalogue's `insights` array instead of brain
- Step 6 ("Update Catalogue State") writes directly to JSON, no MCP merge warning
- Step 7 ("Summary") terminal-only, no brain reference

```markdown
---
name: radar-recommend
description: Match catalogued AI tools and techniques against your goals and usage patterns. Surfaces personalized recommendations.
argument-hint: [--days N] [--focus <category>]
---

# Radar Recommend — Personalized AI Recommendations

Match the catalogue against your personal context — usage patterns, current projects, and installed tools — to surface what you should be paying attention to.

## Arguments

- `$ARGUMENTS` — Optional:
  - `--days N` — How far back to look at session history (default: 14)
  - `--focus <category>` — Filter to a specific category (claude-code, mcp, api, agent-sdk, prompting, tooling, workflow, general-ai)

Parse from `$ARGUMENTS` if provided.

## Workflow

### Step 1: Load the Catalogue

Read `~/.claude/radar/catalogue.json` and collect all items with status `"new"` or `"reviewed"` (skip dismissed and acted-on).

If the file doesn't exist or is empty, tell the user: "No catalogue entries found. Run `/radar-scan` first to build your discovery catalogue."

If `--focus` was specified, filter items to only those with matching `category`.

### Step 2: Load Personal Context

Pull from multiple sources. Each is optional — work with whatever is available.

**Session history:**
Run: `node "${CLAUDE_PLUGIN_ROOT}/bin/workflow-analyzer/dist/cli.js" parse --since ${DAYS} --output /tmp/discover-sessions.json`

If the bundled binary is not available, fall back to `npx @flippyhead/workflow-analyzer@latest parse --since ${DAYS} --output /tmp/discover-sessions.json`.

Read the output file. If session history exceeds 50 sessions, summarize the top patterns:
- Most-used tools (top 10)
- Most-active projects (by session count)
- Recurring topics in user prompts
- Tool failure patterns

**Current environment:**
- Read `~/.claude/settings.json` for installed permissions and allowed tools
- Look for `.mcp.json` files in the home directory and current project for installed MCP servers
- Check `~/.claude/plugins/` for installed plugins

**User instructions (lightweight):**
- Read `~/.claude/CLAUDE.md` if it exists — look for stated goals, priorities, or focus areas the user has written down. Do not prompt the user to add goals if none are found — just proceed without goal-based scoring.

### Step 3: Match and Rank

For each catalogue item, evaluate against the loaded context. Score on four dimensions:

**Goal alignment (0-3):**
- 3: Directly addresses a stated goal or priority found in CLAUDE.md
- 2: Related to an active project's domain
- 1: Tangentially useful based on session history
- 0: No connection

**Usage gap (0-3):**
- 3: User is doing something manually that this automates (evidence in session data)
- 2: User is using a tool that has a better/newer alternative
- 1: User works in the relevant domain but hasn't needed this yet
- 0: No gap identified

**Recency (0-2):**
- 2: Discovered in the last 7 days
- 1: Discovered in the last 30 days, or newly relevant due to a recently started project
- 0: Older

**Effort/impact (0-2):**
- 2: Low effort, high impact (e.g., a config change or install command)
- 1: Medium effort or medium impact
- 0: High effort or low impact

**Total score: 0-10.** Skip items scoring below 3.

Items with `lastRecommended` within the last 14 days should be deprioritized (reduce score by 2) to avoid re-surfacing the same recommendations.

### Step 4: Present Recommendations

Sort by total score descending. Group into tiers:

**Act Now** (score 7-10):
Items with high relevance and low effort. Lead with what the user is doing that this improves. Format:

> **[Title]** (score: N/10)
> You're [specific observation from session data or goals]. [This tool/feature] [specific benefit].
> **Next step:** [concrete action — install command, link to try, config change]

**Worth Exploring** (score 5-6):
Items with moderate relevance. Format:

> **[Title]** (score: N/10)
> Given your work on [project/domain], this [what it does]. Worth a deeper look when [suggested timing].
> **Link:** [url]

**On Your Radar** (score 3-4):
Brief format:

> **[Title]** — [one sentence on what it is and why it might matter] ([url])

Limit output to:
- Act Now: up to 5 items
- Worth Exploring: up to 5 items
- On Your Radar: up to 5 items

If no items score above 3, report: "Nothing in the current catalogue connects strongly to your usage patterns. The catalogue may need more entries — try running `/radar-scan` or adding items manually."

### Step 5: Save Insights

For items scoring 5+ (Act Now and Worth Exploring tiers), create insight entries and append to the catalogue's `insights` array:

```json
{
  "id": "insight-<timestamp>-<index>",
  "type": "recommendation",
  "observation": "what the data shows — cite the specific usage pattern or environment detail",
  "recommendation": "the concrete action to take",
  "evidence": ["score breakdown: goal=N, gap=N, recency=N, effort=N, total=N"],
  "relatedItems": ["<item id>"],
  "createdAt": "<ISO date>",
  "status": "new"
}
```

### Step 6: Update Catalogue State

For each item that was recommended, update its properties:
- `lastRecommended`: today's ISO date
- `score`: the computed total score
- `scoreBreakdown`: `{ "goalAlignment": N, "usageGap": N, "recency": N, "effort": N }`

Write the updated catalogue back to `~/.claude/radar/catalogue.json`.

### Step 7: Summary

Output a brief terminal summary:
- The top 2-3 "Act Now" recommendations (one line each)
- How many total recommendations across all tiers
- How many new insights were saved to the catalogue
```

- [ ] **Step 2: Commit**

```bash
git add plugins/radar/skills/radar-recommend/SKILL.md
git commit -m "feat(radar): refactor radar-recommend to local-only persistence"
```

---

### Task 6: Refactor radar-analyze Skill to Local-Only

**Files:**
- Modify: `plugins/radar/skills/radar-analyze/SKILL.md`

- [ ] **Step 1: Rewrite radar-analyze SKILL.md**

Key changes:
- Step 2 ("Check Previous Insights") reads from `~/.claude/radar/catalogue.json` insights array instead of MCP `get_insights`
- Step 3 ("Fetch User Goals") reads `~/.claude/CLAUDE.md` for stated goals instead of MCP `get_lists`
- Step 5 ("Publish") writes insights to the catalogue JSON and to the markdown report; removes brain MCP fallback
- Step 6 ("Summary") terminal-only, no brain reference
- Action type "save" destination changes from "AI Brain / CLAUDE.md / etc" to "CLAUDE.md or project memory"

```markdown
---
name: radar-analyze
description: Analyze your Claude Code and Cowork session history to surface actionable workflow insights. Diagnoses failures, identifies automation opportunities, aligns time allocation with goals, and flags repeated knowledge worth saving.
argument-hint: [--days N]
---

# Radar Analyze

Analyze recent Claude Code and Cowork sessions to generate actionable workflow insights.

Uses the bundled workflow-analyzer for session parsing and enrichment. Claude does the reasoning.

## Arguments

- `$ARGUMENTS` — Optional:
  - `--days N` — How many days of history to analyze (default: 7)

Parse the days value from `$ARGUMENTS` if provided. Default to 7.

## Workflow

### Step 1: Parse & Enrich Session Data

Run the workflow-analyzer CLI to parse and enrich sessions from all configured sources (Claude Code + Cowork):

```bash
# Bundled binary (preferred)
node "${CLAUDE_PLUGIN_ROOT}/bin/workflow-analyzer/dist/cli.js" parse --since ${DAYS} --output /tmp/workflow-analyzer-parsed.json

# Fallback if bin/ not available:
# npx @flippyhead/workflow-analyzer@latest parse --since ${DAYS} --output /tmp/workflow-analyzer-parsed.json
```

If the command fails, surface the error output directly to the user. Do not swallow the error or exit silently.

Read the output file. It contains `{ sessions: [...], sessionGroups: [...] }`.

If sessions is empty, report "No activity in the last N days" and stop.

Otherwise, note the summary: how many sessions, which sources (claude-code, cowork), how many session groups.

### Step 2: Check Previous Insights

Read `~/.claude/radar/catalogue.json` and look at the `insights` array. Note:
- Insights with `status: "new"` — unresolved insights to avoid duplicating
- Insights with `status: "dismissed"` — things the user doesn't want to see again

Build a set of existing insight IDs and observation text to use for deduplication. If the catalogue doesn't exist, skip this step.

### Step 3: Check for User Goals

Read `~/.claude/CLAUDE.md` if it exists. Look for stated goals, priorities, or focus areas. These are used by the Decision Support analysis below.

If no goals are found, skip goal-based analysis.

### Step 4: Analyze

With all data gathered, analyze the parsed sessions and produce insights across four modules. For each insight, you MUST provide a concrete action — never just describe a problem without telling the user what to do about it.

**Module A — Root Cause Diagnosis:**

Look at tool failures in the session data. For each tool with a notable failure rate:
- Read the actual error messages (not just counts)
- Diagnose the root cause: is it an auth issue, config problem, API bug, user error, or transient?
- If fixable: provide the specific command or config change to fix it (`action type: run` or `action type: install`)
- If not fixable: acknowledge it so the user stops worrying (`action type: acknowledge`)
- Skip tools with very low failure counts (<3 calls) or very low failure rates (<20%)

**Module B — Direct Automation:**

Look for patterns that could be automated:
- **Permission confirmations**: Count short messages like "yes", "y", "a", "ok", "sure" that appear to be tool permission confirmations. If a specific tool triggers many confirmations, suggest an allowedTools config entry (`action type: install` with settings.json patch)
- **Repeated prompts**: Look at user messages across sessions for frequently typed prompts. If a prompt appears 5+ times, suggest creating a skill or alias (`action type: install` with skill content)
- **Repeated tool sequences**: Look for the same sequence of 3+ tool calls appearing across sessions. Suggest automation if a pattern repeats 5+ times.

**Module C — Decision Support:**

Using the session groups and any user goals from Step 3:
- Calculate time allocation by project/topic (sessions and minutes)
- Compare against stated goals — flag misalignments
- Note cross-platform patterns (e.g., "researched X in Cowork but never implemented in Claude Code")
- If a project is consuming disproportionate time without being in the goals, surface a decision (`action type: decide`)

**Module D — Knowledge Nudges:**

Look for repeated topics across sessions:
- Find user prompts that ask about the same thing in multiple sessions (sign the answer should be saved)
- Detect when the user provides the same context/background repeatedly at session start (should be in CLAUDE.md or memory)
- For repeated topics, generate a consolidated summary of what to save (`action type: save`)

### Insight Format

For each insight, produce:

```json
{
  "module": "root-cause | direct-automation | decision-support | knowledge-nudges",
  "severity": "alert | action | suggestion | info",
  "title": "One-line summary",
  "observation": "What the data shows (with specific numbers)",
  "diagnosis": "Why this is happening (optional)",
  "action": {
    "type": "install | run | save | review | decide | acknowledge"
  },
  "evidence": [{"metric": "specific numbers"}],
  "effort": "low | medium | high",
  "impact": "low | medium | high",
  "confidence": 0.0-1.0,
  "deduplicationKey": "unique-key-for-this-insight"
}
```

Action types:
- `install`: `{ type: "install", artifact: "filename", content: "file content to install" }`
- `run`: `{ type: "run", command: "command to run", explanation: "why" }`
- `save`: `{ type: "save", content: "what to save", destination: "CLAUDE.md or project memory" }`
- `review`: `{ type: "review", summary: "what to look at", links: [] }`
- `decide`: `{ type: "decide", question: "decision to make", options: ["option 1", "option 2"] }`
- `acknowledge`: `{ type: "acknowledge", message: "FYI only, no action needed" }`

Aim for 5-10 total insights. Prioritize high-impact/low-effort actions. Skip insights that duplicate existing insights from Step 2.

### Step 5: Save Insights

1. Write insights to a temp file and use the CLI to publish as a markdown report:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/workflow-analyzer/dist/cli.js" publish --insights /tmp/workflow-analyzer-insights.json
```

The insights JSON file should contain:
```json
{
  "insights": [...],
  "metadata": {
    "period": { "since": "ISO date", "until": "ISO date" },
    "sessionCount": N,
    "sources": ["claude-code", "cowork"],
    "modulesRun": ["root-cause", "direct-automation", "decision-support", "knowledge-nudges"]
  }
}
```

Write this file before running the publish command.

2. Append insights to `~/.claude/radar/catalogue.json`'s `insights` array, converting to the catalogue insight schema:

```json
{
  "id": "analyze-<deduplicationKey>",
  "type": "pattern",
  "observation": "<insight.observation>",
  "recommendation": "<describe the action>",
  "evidence": ["<insight.evidence metrics>"],
  "relatedItems": [],
  "createdAt": "<ISO date>",
  "status": "new"
}
```

### Step 6: Summary

Output a brief summary:
- How many insights were generated, by module
- The report period and session count (including Cowork if any)
- Top 2-3 "quick win" recommendations (highest impact, lowest effort)
```

- [ ] **Step 2: Commit**

```bash
git add plugins/radar/skills/radar-analyze/SKILL.md
git commit -m "feat(radar): refactor radar-analyze to local-only persistence"
```

---

### Task 7: Create radar-review Skill

**Files:**
- Create: `plugins/radar/skills/radar-review/SKILL.md`

- [ ] **Step 1: Create the skill directory**

```bash
mkdir -p plugins/radar/skills/radar-review
```

- [ ] **Step 2: Write the SKILL.md**

```markdown
---
name: radar-review
description: Review your radar catalogue — browse, star, dismiss, annotate, and filter discovered tools and insights.
argument-hint: [--status <new|starred|all>] [--since <date>] [--category <name>]
---

# Radar Review — Catalogue Review Interface

Browse and manage your radar catalogue through conversation. Star items worth pursuing, dismiss noise, add notes, and filter by date, status, or category.

## Arguments

- `$ARGUMENTS` — Optional:
  - `--status <new|starred|reviewed|dismissed|acted-on|all>` — Filter by status (default: new)
  - `--since <date or "7d" or "30d">` — Show items discovered after this date
  - `--category <name>` — Filter by category
  - `--insights` — Show insights instead of catalogue items

Parse from `$ARGUMENTS` if provided. Default to `--status new`.

## Workflow

### Step 1: Load Catalogue

Read `~/.claude/radar/catalogue.json`. If it doesn't exist, tell the user: "No catalogue found. Run `/radar-scan` first to discover tools and techniques."

### Step 2: Filter and Display

Apply filters from arguments:
- `--status`: match item `status` field. `all` shows everything.
- `--since`: match items where `discoveredAt` is after the given date. Support relative formats: "7d" = 7 days ago, "30d" = 30 days ago.
- `--category`: match item `category` field.
- `--insights`: show the `insights` array instead of `items`.

If showing items, sort by `discoveredAt` descending (newest first). Group by category.

Display format for items:

```
## [Category Name] (N items)

1. ★ **[Title]** — [description]
   [url] | [source] | discovered [relative date]
   Status: [status] | Score: [score/10 or unscored]
   Notes: [count] | Last note: "[preview]"

2. **[Title]** — [description]
   ...
```

Use ★ prefix for starred items. Use ~~strikethrough~~ for dismissed items (only shown with `--status all`).

Number items sequentially (1, 2, 3...) for easy reference in commands.

Display format for insights:

```
## Insights (N total, M new)

1. **[type]** — [observation]
   Recommendation: [recommendation]
   Related items: [list]
   Status: [status] | Created: [date]
```

After displaying, show the available commands:

```
**Commands:** star <N>, dismiss <N>, reviewed <N>, acted-on <N>,
note <N> "<text>", show <status|category|starred|all>,
clear dismissed [--older-than 30d], add "<url>" [description]
```

### Step 3: Interactive Commands

Wait for user input. Process commands:

**Status changes:**
- `star <N or N-M or N,M,O>` — Set status to `starred`, set `reviewedAt` to now
- `dismiss <N or N-M or N,M,O>` — Set status to `dismissed`, set `reviewedAt` to now
- `reviewed <N or N-M or N,M,O>` — Set status to `reviewed`, set `reviewedAt` to now
- `acted-on <N or N-M or N,M,O>` — Set status to `acted-on`, set `reviewedAt` to now

**Annotations:**
- `note <N> "<text>"` — Append `{ "at": "<now>", "text": "<text>" }` to the item's `notes` array

**Navigation:**
- `show new` / `show starred` / `show all` / `show dismissed` — re-filter and display
- `show <category>` — filter by category name
- `show insights` — switch to insights view

**Maintenance:**
- `clear dismissed` — Remove items with status `dismissed` that were reviewed more than 30 days ago
- `clear dismissed --older-than <N>d` — Custom age threshold
- `add "<url>"` — Add a new item with `source: "manual"`, `status: "new"`. Optionally include a description after the URL.

**Bulk natural language:**
The user may also give natural-language instructions like "dismiss everything from YouTube" or "star all the MCP items". Interpret these and apply the appropriate status changes.

After each command, write the updated catalogue to `~/.claude/radar/catalogue.json`, confirm the action briefly, and re-display the current filtered view.

### Step 4: Summary on Exit

When the user is done (moves on to another topic or says "done"), output a brief summary of changes made this session:
- Items starred: N
- Items dismissed: N
- Items reviewed: N
- Notes added: N
- Items added: N
```

- [ ] **Step 3: Commit**

```bash
git add plugins/radar/skills/radar-review/
git commit -m "feat(radar): add /radar-review conversational catalogue review skill"
```

---

### Task 8: Refactor radar (Combined) Skill

**Files:**
- Modify: `plugins/radar/skills/radar/SKILL.md`

- [ ] **Step 1: Rewrite radar SKILL.md**

```markdown
---
name: radar
description: Your AI development radar — scan the ecosystem for new tools and techniques, then get personalized recommendations. Combines radar-scan and radar-recommend in one command.
argument-hint: [--days N] [--sources <all|feeds|manual>] [--focus <category>]
---

# Radar

Combined scan + recommend pipeline. Scans external sources for new AI tools and techniques, then matches them against your usage patterns to surface personalized recommendations.

This is the default entry point. Use `/radar-scan` or `/radar-recommend` separately if you need different scheduling cadences (e.g., scan daily, recommend weekly).

## Arguments

- `$ARGUMENTS` — Optional:
  - `--days N` — Lookback window for both scan and recommend (default: 7 for scan, 14 for recommend)
  - `--sources <all|feeds|manual>` — Source filter for scan phase (default: all). "feeds" = structured external sources (Anthropic, HN, GitHub, YouTube, dependency changelogs). "manual" = process user-added inbox items only.
  - `--focus <category>` — Category filter for recommend phase (claude-code, mcp, api, agent-sdk, prompting, tooling, workflow, general-ai)

Parse from `$ARGUMENTS` if provided.

## Workflow

### Phase 1: Scan

Execute the full `/radar-scan` workflow with the `--sources` and `--days` arguments.

Print a brief summary of scan results (new items catalogued, notable finds) before proceeding.

### Phase 2: Recommend

Execute the full `/radar-recommend` workflow with the `--days` and `--focus` arguments.

This phase uses the freshly updated catalogue from Phase 1, ensuring recommendations reflect the latest scan.

### Summary

Output a combined summary:
- Scan: how many new items catalogued, by source
- Recommendations: top "Act Now" items
- Tip: "Run `/radar-review` to browse and manage your catalogue."
```

- [ ] **Step 2: Commit**

```bash
git add plugins/radar/skills/radar/SKILL.md
git commit -m "feat(radar): refactor combined radar skill, remove brain references"
```

---

### Task 9: Update First-Run Hook

**Files:**
- Modify: `plugins/radar/hooks/first-run.mjs`

- [ ] **Step 1: Update catalogue path**

In `plugins/radar/hooks/first-run.mjs`, change the catalogue check path from `~/.claude/radar-catalogue.json` to `~/.claude/radar/catalogue.json`. Keep the legacy path check as a fallback.

Replace lines 23-29:

```javascript
    const catalogueExists = await fileExists(
      join(home, ".claude", "radar-catalogue.json")
    );
    const legacyCatalogueExists = await fileExists(
      join(home, ".claude", "scout-catalogue.json")
    );
```

With:

```javascript
    const catalogueExists = await fileExists(
      join(home, ".claude", "radar", "catalogue.json")
    );
    const legacyCatalogueExists =
      (await fileExists(join(home, ".claude", "radar-catalogue.json"))) ||
      (await fileExists(join(home, ".claude", "scout-catalogue.json")));
```

- [ ] **Step 2: Commit**

```bash
git add plugins/radar/hooks/first-run.mjs
git commit -m "fix(radar): update first-run hook for new catalogue path"
```

---

### Task 10: Rewrite README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README.md with single-product pitch**

```markdown
# Radar

Your AI development radar. Analyzes your coding sessions, scans the ecosystem, and tells you what matters — based on what you actually do.

Works with Claude Code. Zero setup. All data stays local.

## Install

```bash
/plugin marketplace add flippyhead/radar
/plugin install radar@flippyhead/radar
```

## Commands

| Command | What it does |
|---------|-------------|
| `/radar` | Scan ecosystem + get personalized recommendations |
| `/radar-analyze` | Analyze your recent coding sessions for workflow insights |
| `/radar-scan` | Scan HN, GitHub, YouTube, Anthropic, and your dependencies for new tools |
| `/radar-recommend` | Match discoveries against your usage patterns |
| `/radar-review` | Browse, star, dismiss, and annotate your catalogue |

## How It Works

**Scan** — Radar pulls from Hacker News, GitHub, YouTube, the Anthropic changelog, and your project dependencies. It builds a local catalogue of AI tools, MCP servers, features, and techniques.

**Analyze** — Parses your Claude Code session history to find tool failures, automation opportunities, time allocation patterns, and repeated knowledge worth saving.

**Recommend** — Matches catalogue entries against your actual usage patterns, installed tools, and active projects. Scores each item on goal alignment, usage gap, recency, and effort/impact.

**Review** — Conversational interface to manage your catalogue. Star things to try, dismiss noise, add notes, filter by date or category.

## Data

Everything lives in `~/.claude/radar/catalogue.json` — a single JSON file you own. No accounts, no servers, no external dependencies.

The catalogue schema is stable and documented. Future adapter plugins can sync it to Notion, Linear, ClickUp, or any other system.

## Upgrading

From `claude-workflow-analyst`:

```bash
/plugin marketplace remove flippyhead/claude-workflow-analyst
/plugin marketplace add flippyhead/radar
```

Radar automatically migrates your existing catalogue on first run.

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README as single-product Radar pitch"
```

---

### Task 11: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the overview section**

Replace the overview to remove "Ships two plugins" framing. Change to:

```markdown
## Overview

A Claude Code plugin for AI workflow intelligence. Published as `flippyhead/radar`.

**Radar** analyzes your coding sessions, scans the AI ecosystem, and recommends tools and techniques that match your actual usage patterns. All data stays local in `~/.claude/radar/catalogue.json`.
```

- [ ] **Step 2: Update the repo structure**

Remove references to open-brain from the primary structure. Update the radar section:

```
.claude-plugin/          — root plugin config (plugin.json) + marketplace listing (marketplace.json)
plugins/
  radar/                 — workflow intelligence plugin
    .claude-plugin/      — per-plugin plugin.json
    bin/
      workflow-analyzer/ — bundled CLI (source + compiled dist)
    hooks/               — hooks.json + install.mjs + first-run.mjs
    skills/
      radar/SKILL.md             — combined scan + recommend
      radar-analyze/SKILL.md     — session analysis
      radar-scan/SKILL.md        — external source scanning
      radar-recommend/SKILL.md   — personalized recommendations
      radar-review/SKILL.md      — catalogue review interface
  open-brain/            — persistent memory plugin (separate, optional)
    ...
scripts/
  bump-version.sh        — updates version in all 3 locations
```

- [ ] **Step 3: Remove brain-optional design note from Architecture section**

Remove the paragraph that starts with "**Brain-optional design:**". Replace with:

```markdown
**Local-first design:** All radar skills persist data to `~/.claude/radar/catalogue.json`. No external services required. The catalogue JSON schema is stable and designed for future adapter plugins that can sync to external systems (Notion, Linear, etc.).
```

- [ ] **Step 4: Remove the MCP config section reference for radar**

Remove or update the line about `.mcp.json` in the radar plugin description since the file no longer exists. Keep the open-brain MCP config note.

- [ ] **Step 5: Update plugin install commands**

```markdown
## Plugin Install Commands

```bash
# Install from marketplace (recommended)
/plugin marketplace add flippyhead/radar
/plugin install radar@flippyhead/radar

# Optional: persistent memory (separate plugin)
/plugin install open-brain@flippyhead/radar
```
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for local-only radar architecture"
```

---

### Task 12: Update Marketplace Metadata and Bump Version

**Files:**
- Modify: `.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `plugins/radar/.claude-plugin/plugin.json`

- [ ] **Step 1: Update marketplace.json description**

In `.claude-plugin/marketplace.json`, update the root `description` to remove "persistent memory":

```json
"description": "Your AI development radar — workflow intelligence for Claude Code"
```

Update the radar plugin description:

```json
"description": "Analyzes your coding sessions, scans the AI ecosystem, and recommends tools and techniques that match your workflow. All data stays local."
```

- [ ] **Step 2: Update root plugin.json description**

In `.claude-plugin/plugin.json`, update:

```json
"description": "Your AI development radar — workflow intelligence for Claude Code"
```

- [ ] **Step 3: Bump version**

This is a minor version bump — new feature (radar-review), significant refactor (local-only).

```bash
./scripts/bump-version.sh radar 4.0.0
```

Use 4.0.0 because this is a breaking change for users who relied on brain-mode persistence in radar skills.

- [ ] **Step 4: Verify**

```bash
grep -r "version" .claude-plugin/plugin.json .claude-plugin/marketplace.json plugins/radar/.claude-plugin/plugin.json
```

Expected: All show 4.0.0 for radar.

- [ ] **Step 5: Commit**

```bash
git add .claude-plugin/ plugins/radar/.claude-plugin/
git commit -m "chore(radar): bump to 4.0.0 — local-only breaking change"
```

---

### Task 13: End-to-End Verification

- [ ] **Step 1: Verify no brain references remain in radar skills**

```bash
grep -ri "brain\|get_lists\|get_list\|create_list_item\|update_list_item\|create_report\|capture_thought\|get_insights\|browse_recent" plugins/radar/skills/
```

Expected: Zero matches.

- [ ] **Step 2: Verify no brain references in radar hooks**

```bash
grep -ri "brain" plugins/radar/hooks/
```

Expected: Zero matches.

- [ ] **Step 3: Verify .mcp.json is deleted**

```bash
test -f plugins/radar/.mcp.json && echo "FAIL: .mcp.json still exists" || echo "OK: .mcp.json removed"
```

Expected: "OK: .mcp.json removed"

- [ ] **Step 4: Verify workflow-analyzer builds and tests pass**

```bash
cd plugins/radar/bin/workflow-analyzer && npm test && npm run build
```

Expected: All tests pass, build succeeds.

- [ ] **Step 5: Verify CLI still works**

```bash
node plugins/radar/bin/workflow-analyzer/dist/cli.js parse --since 3 --output /tmp/test-parse.json
```

Expected: Parses sessions without errors.

- [ ] **Step 6: Spot-check that open-brain plugin is untouched**

```bash
git diff plugins/open-brain/
```

Expected: No changes.

---

## Future Work (Not in This Plan)

These are Phase 2 and Phase 3 items, documented for reference:

1. **`radar-brain` adapter plugin** — Thin plugin that syncs `~/.claude/radar/catalogue.json` to AI Brain's `[Radar]` lists. Ships `/radar-sync-brain`. Restores Peter's personal brain-backed workflow.
2. **Adapter plugin contract documentation** — Document the catalogue JSON schema formally so third parties can write adapters (radar-notion, radar-linear, radar-clickup, etc.).
3. **Reference adapter** — Write one non-brain adapter (e.g., radar-obsidian — writes markdown files with frontmatter) to prove the adapter pattern works.
4. **Move open-brain to its own marketplace listing** — Separate repo or separate marketplace.json entry so it's not co-marketed with Radar.
5. **Static HTML dashboard** — Read-only visual overview of catalogue.json, generated by a `/radar-dashboard` command. Supplement to conversational review.
