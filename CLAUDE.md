# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A Claude Code plugin marketplace repo containing two plugins that integrate with [Open Brain](https://ai-brain-pi.vercel.app) — a personal AI memory layer. Published as `flippyhead/claude-workflow-analyst`.

## Repo Structure

```
.claude-plugin/          — root plugin config (plugin.json) + marketplace listing (marketplace.json)
plugins/
  workflow-analyst/      — workflow analysis skill
    .claude-plugin/      — per-plugin plugin.json
    .mcp.json            — MCP server config (ai-brain HTTP connector)
    skills/workflow-analyst/SKILL.md
  open-brain/            — brain-init, brain-sync, weekly-review skills + hooks
    .claude-plugin/      — per-plugin plugin.json
    .mcp.json            — MCP server config (ai-brain HTTP connector)
    hooks/               — hooks.json + check-brain-status.mjs (SessionStart hook)
    skills/{brain-init,brain-sync,weekly-review}/SKILL.md
```

## Version Management

**ALWAYS bump the version when making changes that affect plugin behavior.**

Version numbers live in three places and must stay in sync:

1. `.claude-plugin/plugin.json` — root plugin version
2. `.claude-plugin/marketplace.json` — version for each plugin listed
3. `plugins/<plugin-name>/.claude-plugin/plugin.json` — per-plugin version

Bump rules:
- **Patch** (2.1.0 → 2.1.1): bug fixes
- **Minor** (2.1.0 → 2.2.0): new features or skill changes
- **Major** (2.1.0 → 3.0.0): breaking changes
- Update ALL three files. If only one plugin changed, bump that plugin's version in marketplace.json and its own plugin.json, plus the root plugin.json.

## Architecture

**Skills** are SKILL.md files containing structured prompts with frontmatter (name, description, argument-hint). They define multi-step workflows that Claude executes at runtime. Skills are NOT code — they are instructions.

**Hooks** are executable scripts (Node.js ESM) triggered by Claude Code lifecycle events. Configured in `hooks.json` per plugin. The `check-brain-status.mjs` hook makes direct MCP JSON-RPC calls to the Open Brain API to check if the user's brain is empty on session start.

**MCP config** (`.mcp.json`) declares the Open Brain HTTP MCP server. Both plugins share the same server URL (`https://ai-brain-pi.vercel.app/api/mcp`). Auth is handled via environment variables: `OPEN_BRAIN_AUTHORIZATION`, `OPEN_BRAIN_TOKEN`, `OPEN_BRAIN_API_KEY`, or `MCP_AUTH_TOKEN`.

**External dependency**: The workflow-analyst skill shells out to `npx @flippyhead/workflow-analyzer@latest` for session parsing and insight publishing. This is a separate npm package, not part of this repo.

## Plugin Install Commands

```bash
/plugin marketplace add flippyhead/claude-workflow-analyst
/plugin install open-brain@claude-workflow-analyst
/plugin install workflow-analyst@claude-workflow-analyst
```
