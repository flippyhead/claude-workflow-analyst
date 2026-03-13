# Brain Sync Skill Design

**Date:** 2026-03-13
**Status:** Draft
**Author:** Peter Brown + Claude

## Overview

A new skill (`/brain-sync`) for the claude-workflow-analyst plugin that syncs the current project's context into the AI Brain MCP. Users invoke it manually when they want the brain to have up-to-date knowledge about a project.

## Problem

The AI Brain is most useful when it has current context about active projects. Today, project knowledge gets into the brain ad-hoc — via CLAUDE.md instructions that say "save to brain when..." But this is inconsistent. Projects drift out of date in the brain, and new projects may never get captured at all.

## Solution

A pure SKILL.md skill (no custom scripts) that:

1. Reads key project files to understand current state
2. Searches the brain for existing knowledge about this project
3. Diffs current state against stored knowledge
4. Captures only new or changed information as thoughts

## Skill Identity

- **Name:** `brain-sync`
- **Invocation:** `/brain-sync`
- **Location:** `skills/brain-sync/SKILL.md`
- **Arguments:** None — always syncs the current working directory
- **Plugin:** Registered in `plugin.json` alongside `workflow-analyst`

## Data Collection

The skill instructs Claude to read these sources from the current project directory:

### Project Identity
- `README.md` — what the project is
- `package.json`, `Cargo.toml`, `pyproject.toml`, or `go.mod` — tech stack, dependencies, version
- `CLAUDE.md` — project-specific instructions and conventions

### Git State
- Current branch (`git branch --show-current`)
- Recent commits (`git log --oneline -20`)
- Open PRs (`gh pr list` if gh CLI available)

### Project Structure
- Top-level directory listing to understand shape and architecture

### Strategic Context
- `docs/` folder contents if present
- `GOALS.md`, `TODO.md`, or similar planning files if they exist
- Any other files that reveal project direction

Claude reads these files directly and synthesizes a mental model of:
- What the project is and does
- Tech stack and architecture
- Current status and recent activity
- Strategic direction / next steps (if discernible)

## Brain Diff & Sync Flow

### Step 1: Gather Project Context
Read project files as described above. Build a comprehensive understanding of the project's current state.

### Step 2: Search Brain for Existing Knowledge
Call `mcp__ai-brain__search_thoughts` with the project name (derived from directory name, package.json name, or README title) to find what's already stored.

### Step 3: Synthesize and Diff
Compare current project state against existing brain thoughts:
- Identify information that is **new** (not in any existing thought)
- Identify information that has **changed** (contradicts or updates an existing thought)
- Identify information that is **unchanged** (already accurately captured)

### Step 4: Sync to Brain
Based on the diff:

- **First sync** (no existing thoughts found): Capture a comprehensive project summary as a single thought. Include project name prominently for future searchability.
- **Subsequent syncs** (existing thoughts found): Capture only meaningful updates, each framed as an update (e.g., "Update: seikai.tv added Anki export, deployed to production"). Skip unchanged information.
- **No changes**: Tell the user the brain is already up to date. Do not capture anything.

Each thought is a dense, factual summary. Always include the project name so future `search_thoughts` queries find it.

### Step 5: Report to User
Briefly tell the user:
- What was synced (or that everything was already current)
- How many new thoughts were captured
- Key highlights of what changed

## Design Decisions

### Pure SKILL.md, no scripts
The inputs are human-readable files (README, package.json, git log). Claude can read and synthesize these directly — no need for parsing scripts. This keeps the skill simple and adaptable to any project structure.

### Diff-aware, not overwrite
The brain API has no update/delete. We work around this by:
1. Searching for existing thoughts about the project
2. Only capturing new/changed information
3. Framing updates with "Update:" prefix so recency disambiguates

Old thoughts remain but are superseded contextually by newer ones.

### No arguments
The skill always operates on the current working directory. There's no need for flags — it reads what's there and syncs what's changed.

## File Changes Required

1. **New file:** `skills/brain-sync/SKILL.md` — the skill definition
2. **Modified:** `.claude-plugin/plugin.json` — register the new skill

## Out of Scope

- Automatic/hook-based syncing (may add later)
- Deleting or updating existing brain thoughts (API limitation)
- Syncing non-project information (that's what CLAUDE.md instructions handle)
