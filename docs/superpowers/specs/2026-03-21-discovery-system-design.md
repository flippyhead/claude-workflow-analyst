# Discovery System Design

**Date:** 2026-03-21
**Status:** Draft
**Scope:** Two new skills (scout, discover) in claude-workflow-analyst + enriched list items in ai-brain

## Problem

The current workflow-analyst ecosystem is introspective — it analyzes what you did and compares against your goals. But it has zero awareness of what's available externally: new tools, features, techniques, MCP servers, Claude Code capabilities, etc. The AI landscape changes rapidly, and useful things get missed — both newly released features and existing ones that become relevant when starting new work.

There is no systematic way to discover what's out there and match it against what a user is actually doing and trying to accomplish.

## Solution Overview

Two new skills that separate two concerns:

1. **Scout** (`/scout`) — Continuously builds a catalogue of AI tools, features, and techniques from external sources. Runs independently of personal context.
2. **Discover** (`/discover`) — Matches the catalogue against the user's goals, usage patterns, and environment to surface personalized recommendations.

Both live in the `workflow-analyst` plugin. Both use ai-brain for storage if available, with local file fallback.

The catalogue is stored as enriched list items in ai-brain, which requires a small schema extension to `listItems` (3 optional fields).

## Design Decisions

**Enriched list items, not a new table.** Discovery entries are stored as regular list items with `url`, `description`, and `properties` fields. This keeps ai-brain agnostic to specific use cases and makes lists useful for bookmarks, reference links, reading lists, etc. — not just todos.

**Two skills, not one.** Scanning and matching are separate concerns with different cadences. Scout can run daily (cheap, no personal context needed). Discover runs weekly or on-demand (needs your attention to be useful).

**Lives in workflow-analyst plugin, not open-brain.** Follows the same pattern as workflow-analyst itself — uses brain MCP if installed, works standalone with local fallback. Brain is a storage layer, not the owner of this feature.

## Part 1: Enriched List Items (ai-brain)

### Schema Changes

Add 3 optional fields to the `listItems` table:

```typescript
// In listItems validator
url: v.optional(v.string()),
description: v.optional(v.string()),
properties: v.optional(v.record(v.string(), v.any())),  // key-value object, always a flat-ish map
```

### MCP Tool Changes

**Input changes (accept new optional params):**
- `create_list_item` — add optional `url`, `description`, `properties` params
- `update_list_item` — add optional `url`, `description`, `properties` params

**Output changes (include new fields in responses):**
- `get_list` — return `url`, `description`, `properties` on each item in the items array
- `get_open_items` — return `url`, `description`, `properties` on each item
- `get_lists` — verify it returns list `name` field (needed for `[Scout]` prefix matching); no schema change expected but confirm

**Zod schema changes (MCP server endpoint):**
- Update Zod schemas in the Next.js MCP server endpoint for `create_list_item` and `update_list_item` to accept the new fields
- Update response schemas for `get_list` and `get_open_items` to include the new fields

No new MCP tools. No migration. All fields optional — existing items unaffected.

### Web UI (optional, not blocking)

- Render `url` as a clickable link on list items
- Show `description` below the item title

## Part 2: Scout Skill (`/scout`)

### Location

`plugins/workflow-analyst/skills/scout/SKILL.md`

### Frontmatter

```yaml
---
name: scout
description: Build a catalogue of AI tools, features, and techniques from external sources. Scans changelogs, HN, GitHub, and your inbox.
argument-hint: [--sources <all|feeds|manual>] [--days N]
---
```

### Arguments

`[--sources <all|feeds|manual>] [--days N]`

- `--sources`: which sources to scan (default: all)
- `--days`: how far back to look in time-based sources (default: 7)

### Workflow

**Step 1: Check/create catalogue lists.**

Look for lists with a `[Scout]` prefix. Create if missing:
- `[Scout] Inbox` — raw links dropped by user for enrichment
- `[Scout] Claude Code` — features, settings, tips
- `[Scout] MCP Ecosystem` — servers, plugins, integrations
- `[Scout] AI Tools & Techniques` — broader tools, prompting, workflows

If brain MCP is unavailable, use local JSON file at `~/.claude/scout-catalogue.json` with this structure:

```json
{
  "lists": {
    "[Scout] Inbox": {
      "items": [
        { "title": "...", "url": "...", "description": "...", "status": "open", "properties": {} }
      ]
    },
    "[Scout] Claude Code": { "items": [...] }
  },
  "lastUpdated": "2026-03-21T00:00:00Z"
}
```

**Step 2: Scan structured sources.**

Hit known, high-signal endpoints using Claude Code's `WebSearch` for discovery queries and `WebFetch` for direct URLs/APIs. Limit to **10-15 items per source** to keep runs manageable. If a source fails (timeout, rate limit, format change), log a warning and continue to the next source — never fail the entire run because one source is down.

Sources:
- **Anthropic changelog/blog** — `WebFetch` the changelog page, extract recent entries
- **GitHub** — `WebSearch` for trending MCP servers, Claude Code releases, plugin marketplace
- **Hacker News** — `WebFetch` the Algolia API (`hn.algolia.com/api/v1/search_by_date?query=...&tags=story`) for "claude", "anthropic", "mcp server", "ai agent"
- **YouTube** (if searchable via web) — `WebSearch` for tutorials, workflow demos

For each result: extract title, url, description, date. Deduplicate against existing catalogue items by URL.

**Step 3: Process inbox items.**

Check `[Scout] Inbox` list for manually added items (just a title + url, or even just a url). For each:
- Fetch the page content
- Summarize what it is and why it might be useful
- Add description and tags to properties
- Move to the appropriate catalogue list

**Step 4: Enrich and tag.**

For each new entry, populate `properties` following the Properties Schema Convention (see below):

```json
{
  "category": "claude-code | mcp | api | agent-sdk | prompting | tooling | workflow | general-ai",
  "relevanceHints": ["browser automation", "code review", "project management"],
  "source": "anthropic-changelog | hackernews | github | youtube | manual",
  "discoveredAt": "2026-03-21"
}
```

**Step 5: Report.**

Brief summary: N new items catalogued, N inbox items processed, N duplicates skipped. List the most notable new finds.

### Properties Schema Convention

Scout and discover share a contract for the `properties` field on catalogue items. This is a convention, not enforced by the database.

**Fields set by scout:**

| Field | Type | Description |
|-------|------|-------------|
| `category` | string | One of: `claude-code`, `mcp`, `api`, `agent-sdk`, `prompting`, `tooling`, `workflow`, `general-ai` |
| `relevanceHints` | string[] | Free-text tags describing what workflows/goals this helps with |
| `source` | string | One of: `anthropic-changelog`, `hackernews`, `github`, `youtube`, `manual` |
| `discoveredAt` | string | ISO date when the item was first catalogued |

**Fields set by discover:**

| Field | Type | Description |
|-------|------|-------------|
| `lastRecommended` | string | ISO date when this was last surfaced to the user |
| `matchedGoals` | string[] | Which user goals this was matched against |
| `matchedPatterns` | string[] | Which usage patterns triggered the match |

Both skills must preserve fields set by the other — never overwrite the entire `properties` object, only merge new keys.

### Behavioral Properties

- **Idempotent** — running twice won't duplicate entries (dedup by URL)
- **Incremental** — web sources are bounded by `--days N`; inbox items are considered "processed" once moved out of the Inbox list to a category list
- **Source-independent** — each source is optional; partial runs are fine

## Part 3: Discover Skill (`/discover`)

### Location

`plugins/workflow-analyst/skills/discover/SKILL.md`

### Frontmatter

```yaml
---
name: discover
description: Match catalogued AI tools and techniques against your goals and usage patterns. Surfaces personalized recommendations.
argument-hint: [--days N] [--focus <category>]
---
```

### Arguments

`[--days N] [--focus <category>]`

- `--days`: how far back to look at session history (default: 14)
- `--focus`: filter to a specific category (e.g., `claude-code`, `mcp`)

### Workflow

**Step 1: Load the catalogue.**

Read `[Scout]` lists from brain (or local JSON fallback). Filter to items with status "open" (not yet adopted or dismissed).

**Step 2: Load personal context.**

Pull from multiple sources, all optional — work with whatever is available:
- **Brain goals** — `get_lists` with `pinned: true`
- **Brain thoughts** — `browse_recent` for recent topics and interests
- **Session history** — `npx @flippyhead/workflow-analyzer@latest parse --since N` for actual tools used, projects worked on, patterns. If session history exceeds 50 sessions, summarize the top patterns (most-used tools, most-active projects, recurring topics) rather than loading raw data.
- **Current environment** — installed MCP servers (`.mcp.json` files), Claude Code settings, installed plugins

**Step 3: Match and rank.**

For each open catalogue item, score against context:
- **Goal alignment** — does this help with a pinned goal?
- **Usage gap** — is the user doing something manually that this automates? Using a tool with a better alternative?
- **Recency** — newly released, or newly relevant because of a project just started?
- **Effort/impact** — how hard to adopt vs. how much it helps?

Skip items that don't connect to anything in the user's context. The point is filtering, not listing everything.

**Step 4: Present recommendations.**

Group into tiers:
- **Act now** (high relevance, low effort) — "You're spending time on X, this tool does it automatically"
- **Worth exploring** (high relevance, higher effort) — "Given your goal of Y, this technique is worth a deeper look"
- **On your radar** (moderate relevance) — "Not urgent but you should know about this"

Each recommendation includes:
- What it is
- Why it matters *to you specifically* (citing the goal or usage pattern it connects to)
- Concrete next step (link, install command, or suggestion)

**Step 5: Update catalogue state.**

Mark recommended items with `properties.lastRecommended` date so they aren't re-surfaced every run. Items the user dismisses (via brain UI or direct feedback) get marked done.

**Step 6: Optionally save to brain.**

If brain is available, offer to capture a "Discovery digest" thought summarizing top recommendations. This lets weekly-review reference it.

## Integration with Existing Skills

**workflow-analyst** — Unchanged. Scout and discover are sibling skills, not modifications. Discover can optionally consume workflow-analyst's parsed session data for richer matching context.

**weekly-review** — Unchanged. If a discover digest thought exists in the brain, weekly-review's "Knowledge Captured" section naturally picks it up. No code changes needed.

**brain-sync** — No interaction. Different concern.

## Catalogue List Conventions

| List Name | Purpose |
|-----------|---------|
| `[Scout] Inbox` | Raw links dropped by user for enrichment |
| `[Scout] Claude Code` | Features, settings, tips, shortcuts |
| `[Scout] MCP Ecosystem` | Servers, plugins, integrations |
| `[Scout] AI Tools & Techniques` | Broader tools, prompting techniques, workflows |

Lists are auto-created by scout on first run. User can rename or reorganize — scout matches by `[Scout]` prefix.

## Data Flow

```
Sources                     Scout                    Catalogue                  Discover                User
─────────────────          ──────                   ─────────                  ────────               ────
Anthropic changelog ──┐
HN / GitHub / YT ─────┼──→ /scout ──────────────→ [Scout] lists ───┐
Manual links ──────────┘   (scheduled or manual)   (brain or local) │
                                                                     ├──→ /discover ──→ Recommendations
                           Brain goals ─────────────────────────────┤    (manual or
                           Session history (workflow-analyzer) ─────┤     weekly)
                           Current environment ─────────────────────┘

                           Weekly review ←── references discover digest
```

## Scheduling

- **Scout:** Daily or every few days. Catalogue building is cheap and doesn't need user attention.
- **Discover:** Weekly or on-demand. Matching needs user attention to be useful.

## Implementation Scope

### ai-brain repo (small)
- Add 3 optional fields to listItems validator
- Update create/update/get MCP tools to handle new fields
- Optional: UI rendering of url and description on list items

### claude-workflow-analyst repo (medium)
- New skill: `plugins/workflow-analyst/skills/scout/SKILL.md`
- New skill: `plugins/workflow-analyst/skills/discover/SKILL.md`
- Version bumps per CLAUDE.md rules

### Not in scope
- Changes to workflow-analyst skill
- Changes to weekly-review, brain-sync, or brain-init skills
- New npm packages or CLI tools (skills use existing web search/fetch + workflow-analyzer CLI)
