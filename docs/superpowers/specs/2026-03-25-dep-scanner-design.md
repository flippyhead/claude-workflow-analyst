# Dependency Scanner for workflow-analyzer

**Date:** 2026-03-25
**Status:** Approved

## Summary

Add a `scan-deps` CLI subcommand to `@flippyhead/workflow-analyzer` that discovers npm dependencies across all Claude-related projects, resolves them to GitHub repos, and fetches recent releases. The scout skill then uses this structured output to catalogue interesting dependency updates (new CLIs, MCP integrations, AI features, breaking changes).

## Motivation

Package dependencies are a high-signal discovery source. When a dependency you already use ships a new CLI, MCP server, or AI integration (e.g. Resend shipping resend-cli, Convex shipping a built-in MCP server), that's directly actionable. Currently the scout skill only searches generic sources (HN, GitHub search, Anthropic blog). Dependency-seeded discovery fills the gap.

## CLI Interface

```
npx @flippyhead/workflow-analyzer@latest scan-deps [--since N] [--include-dev] [--output path.json]
```

- `--since N` — only include GitHub releases published in the last N days (default: 7). Does not affect which projects or packages are scanned — all discovered projects and deps are always resolved. Only the release date filter is affected.
- `--include-dev` — also scan devDependencies (default: production deps only, to stay within rate limits)
- `--output` — write JSON to file (default: stdout)

## Discovery Flow

### Step 1: Find projects

Reuse the existing config-driven project discovery from `~/.claude/projects/`. The existing codebase (ClaudeCodeParser) already handles path decoding — import and reuse that logic rather than reimplementing. Directory names encode filesystem paths where `/` is replaced with `-` (e.g. `Users-peterbrown-Development-ai-brain` -> `/Users/peterbrown/Development/ai-brain`). Note: this encoding is potentially ambiguous for paths containing hyphens, but the existing parser handles this and we reuse its logic as-is.

### Step 2: Find package.json files

For each decoded project path:
1. Look for `package.json` at the project root
2. If `workspaces` field exists, resolve workspace glob patterns and find package.json in each workspace directory
3. Collect `dependencies` (and `devDependencies` if `--include-dev`) into a deduplicated set (keyed by package name)
4. Use Node.js built-in `glob` from `fs` module or `fast-glob` for workspace pattern resolution. Log a warning and skip any workspace that fails to resolve.

### Step 3: Resolve to GitHub repos

For each unique package name:
1. Fetch `https://registry.npmjs.org/<package>` (the npm registry metadata). On 404 or network error, log a warning and skip (handles private/scoped packages gracefully).
2. Extract `repository` field — handle both object form (`{ url: "..." }`) and string shorthand (`"github:owner/repo"` or bare `"owner/repo"`)
3. Parse out GitHub owner/repo from the URL. Known formats to handle:
   - `git+https://github.com/owner/repo.git`
   - `https://github.com/owner/repo`
   - `github:owner/repo`
   - `git://github.com/owner/repo`
   - `ssh://git@github.com/owner/repo.git`
   - Bare `owner/repo` string shorthand
4. Skip packages without a GitHub repository URL or with non-GitHub repos
5. Deduplicate repos (multiple packages may share a repo, e.g. monorepos). Track which packages map to each repo — the output uses `packages` (plural) listing all matched dep names.

### Step 4: Fetch recent releases

For each unique GitHub repo:
1. Call `https://api.github.com/repos/:owner/:repo/releases?per_page=10`
2. Filter to releases published within the `--since` window
3. Also fetch repo description from the repo metadata (can use the releases response or a separate call)

**Rate limiting:** The unauthenticated GitHub API limit is 60 requests/hour. With `--include-dev` off (default), typical project dep counts stay under this. If `GITHUB_TOKEN` env var is present, use it for the 5,000 req/hr authenticated limit. If a 403/429 rate limit response is received, log a warning with the number of repos remaining and stop fetching — return whatever has been collected so far (graceful degradation).

**Error handling:** On per-repo 404s (repo moved/deleted), timeouts, or other errors, log a warning and continue to the next repo. Never fail the entire scan due to a single repo failure.

### Step 5: Output

Write structured JSON to stdout or `--output` path:

```json
{
  "scannedAt": "2026-03-25T12:00:00Z",
  "projectCount": 3,
  "packageCount": 32,
  "reposResolved": 28,
  "reposWithoutReleases": 12,
  "rateLimited": false,
  "errors": [],
  "releases": [
    {
      "packages": ["convex"],
      "repo": "get-convex/convex-backend",
      "repoDescription": "The open-source reactive database for app developers",
      "release": {
        "tag": "v1.29.0",
        "name": "Convex 1.29",
        "publishedAt": "2026-03-20T00:00:00Z",
        "body": "release notes markdown...",
        "url": "https://github.com/get-convex/convex-backend/releases/tag/v1.29.0"
      },
      "usedBy": ["/Users/peterbrown/Development/ai-brain"]
    }
  ]
}
```

If a repo has multiple releases in the window, each gets its own entry. The `packages` field lists all dependency names from the user's projects that map to this repo (handles monorepos). The `usedBy` field lists which project paths use any of those packages. One entry per (repo, release) pair — intentionally denormalized for simplicity.

## Scout Skill Integration

Add a new step to SKILL.md between "Load Existing Catalogue" (Step 2) and "Scan Structured Sources" (Step 3):

**Step 2.5: Scan Project Dependencies**

Run `npx @flippyhead/workflow-analyzer@latest scan-deps --since ${DAYS} --output /tmp/workflow-analyzer-deps.json`. Read the output JSON.

For each release entry:
1. Use the release notes body + repo description to determine relevance
2. Skip routine patch/bugfix releases (version bumps, typo fixes, minor dep updates)
3. Catalogue interesting finds: new CLI tools, MCP integrations, AI/agent features, breaking changes, significant new APIs
4. Use standard enrichment and tagging from Step 5, with `source: "dependency-changelog"`
5. Deduplicate against existing catalogue URLs as usual

Add `"dependency-changelog"` to the source enum in Step 5.

## Architecture

### Files to create (in workflow-analyzer repo)

- `src/commands/scan-deps.ts` — CLI command handler
- `src/deps/project-discovery.ts` — find projects from ~/.claude/projects/, decode paths, find package.json files
- `src/deps/npm-resolver.ts` — resolve package names to GitHub repos via npm registry
- `src/deps/github-releases.ts` — fetch recent releases from GitHub API
- `src/deps/types.ts` — TypeScript interfaces for the output schema

### Files to modify

- `src/index.ts` (workflow-analyzer) — register `scan-deps` subcommand with commander
- `plugins/workflow-analyst/skills/scout/SKILL.md` (this repo) — add Step 2.5

### Dependencies

No new npm dependencies required. Use Node.js built-in `fetch` for HTTP calls and `fs/path/glob` for filesystem operations.

## What it doesn't do

- No caching of npm registry lookups (they're fast, keep it simple)
- No Python/Ruby/Go ecosystem support (npm only for now, extensible later)
- No changelog scraping — GitHub releases API only. Projects that don't use GitHub releases won't surface here; the existing WebSearch in Step 3 serves as fallback.
- No filtering or intelligence — outputs raw release data. The skill handles relevance filtering.
