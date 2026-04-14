# In-House Workflow Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `@flippyhead/workflow-analyzer` source into the radar plugin as a bundled `bin/` executable, eliminating the `npx` dependency and enabling the new Claude Code plugin `bin/` feature.

**Architecture:** Copy the workflow-analyzer TypeScript source into `plugins/radar/bin/workflow-analyzer/`, compile it in-place, and reference the compiled CLI from skills via `${CLAUDE_PLUGIN_ROOT}/bin/workflow-analyzer/dist/cli.js`. Skills switch from `npx @flippyhead/workflow-analyzer@latest <cmd>` to `node "${CLAUDE_PLUGIN_ROOT}/bin/workflow-analyzer/dist/cli.js" <cmd>`. The separate npm package remains published but is no longer the primary distribution path for radar users.

**Tech Stack:** TypeScript, Node.js ESM, commander, yaml, vitest

---

## File Structure

```
plugins/radar/
  bin/
    workflow-analyzer/          # NEW — copied from ~/Development/workflow-analyzer
      src/                      # All existing source files (unchanged)
      config/                   # default.yaml config
      test/                     # All existing tests
      dist/                     # Compiled output (committed for plugin distribution)
      package.json              # Dependencies for local install
      tsconfig.json
      vitest.config.ts
  skills/
    radar-analyze/SKILL.md      # MODIFY — replace npx with bin/ path
    radar-scan/SKILL.md         # MODIFY — replace npx with bin/ path
    radar-recommend/SKILL.md    # MODIFY — replace npx with bin/ path
  hooks/
    install.mjs                 # NEW — post-install hook to npm install bin/ deps
    hooks.json                  # MODIFY — add PluginInstall hook
```

---

### Task 1: Copy Workflow Analyzer Source into Radar Plugin

**Files:**
- Create: `plugins/radar/bin/workflow-analyzer/` (entire directory)

- [ ] **Step 1: Create the bin directory and copy source**

```bash
mkdir -p plugins/radar/bin/workflow-analyzer
cp -r ~/Development/workflow-analyzer/src plugins/radar/bin/workflow-analyzer/
cp -r ~/Development/workflow-analyzer/config plugins/radar/bin/workflow-analyzer/
cp -r ~/Development/workflow-analyzer/test plugins/radar/bin/workflow-analyzer/
cp ~/Development/workflow-analyzer/package.json plugins/radar/bin/workflow-analyzer/
cp ~/Development/workflow-analyzer/tsconfig.json plugins/radar/bin/workflow-analyzer/
cp ~/Development/workflow-analyzer/vitest.config.ts plugins/radar/bin/workflow-analyzer/
cp ~/Development/workflow-analyzer/.gitignore plugins/radar/bin/workflow-analyzer/
```

- [ ] **Step 2: Strip npm publishing fields from package.json**

Edit `plugins/radar/bin/workflow-analyzer/package.json` to remove fields that only matter for npm publishing. Keep `name`, `version`, `type`, `main`, `types`, `bin`, `scripts`, `dependencies`, `devDependencies`, `engines`. Remove `keywords`, `license` (license is at repo root). Change `name` to `workflow-analyzer` (drop the `@flippyhead/` scope since it's no longer published from here).

The result should be:

```json
{
  "name": "workflow-analyzer",
  "version": "0.3.0",
  "description": "Modular AI workflow analyzer — parse sessions, surface actionable insights",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "workflow-analyzer": "dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "commander": "^13.0.0",
    "yaml": "^2.7.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- [ ] **Step 3: Install dependencies and build**

```bash
cd plugins/radar/bin/workflow-analyzer
npm install
npm run build
```

Expected: `dist/` directory is created with compiled JS files, including `dist/cli.js`.

- [ ] **Step 4: Run tests to verify the copy works**

```bash
cd plugins/radar/bin/workflow-analyzer
npm test
```

Expected: All tests pass (same results as the standalone repo).

- [ ] **Step 5: Verify the CLI runs from the new location**

```bash
node plugins/radar/bin/workflow-analyzer/dist/cli.js --help
```

Expected: Prints usage info with `run`, `parse`, `scan-deps`, and `publish` commands.

- [ ] **Step 6: Commit**

```bash
git add plugins/radar/bin/workflow-analyzer/
git commit -m "feat(radar): copy workflow-analyzer source into plugin bin/"
```

---

### Task 2: Add Post-Install Hook for Dependency Installation

**Files:**
- Create: `plugins/radar/hooks/install.mjs`
- Modify: `plugins/radar/hooks/hooks.json`

When a user installs the radar plugin, `node_modules` won't exist inside `bin/workflow-analyzer/`. We need a hook that runs `npm install --omit=dev` on plugin install.

- [ ] **Step 1: Create the install hook script**

Create `plugins/radar/hooks/install.mjs`:

```javascript
#!/usr/bin/env node

// Post-install hook: installs workflow-analyzer production dependencies.
// Runs on PluginInstall event to ensure bin/ tools are ready.

import { execSync } from "node:child_process";
import { join } from "node:path";
import { access } from "node:fs/promises";

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
if (!pluginRoot) {
  process.exit(0);
}

const analyzerDir = join(pluginRoot, "bin", "workflow-analyzer");

async function install() {
  try {
    // Check if node_modules already exists (skip if so)
    try {
      await access(join(analyzerDir, "node_modules"));
      return; // Already installed
    } catch {
      // Not installed yet — proceed
    }

    execSync("npm install --omit=dev", {
      cwd: analyzerDir,
      stdio: "pipe",
      timeout: 60000,
    });
  } catch (err) {
    // Non-fatal — skills will fall back to npx if bin/ isn't ready
    console.error("Radar: could not install workflow-analyzer dependencies. Skills will use npx fallback.");
  }
}

install();
```

- [ ] **Step 2: Add PluginInstall hook to hooks.json**

Edit `plugins/radar/hooks/hooks.json` to add the PluginInstall event:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/first-run.mjs\"",
            "timeout": 5000
          }
        ]
      }
    ],
    "PluginInstall": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/install.mjs\"",
            "timeout": 120000
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 3: Test the install hook locally**

```bash
CLAUDE_PLUGIN_ROOT=/Users/peterbrown/Development/radar/plugins/radar node plugins/radar/hooks/install.mjs
```

Expected: Either prints nothing (if node_modules exists) or installs dependencies silently.

- [ ] **Step 4: Commit**

```bash
git add plugins/radar/hooks/install.mjs plugins/radar/hooks/hooks.json
git commit -m "feat(radar): add post-install hook for workflow-analyzer deps"
```

---

### Task 3: Update Skills to Use Bundled Binary

**Files:**
- Modify: `plugins/radar/skills/radar-analyze/SKILL.md`
- Modify: `plugins/radar/skills/radar-scan/SKILL.md`
- Modify: `plugins/radar/skills/radar-recommend/SKILL.md`

Each skill currently uses `npx @flippyhead/workflow-analyzer@latest <command>`. Replace with `node "${CLAUDE_PLUGIN_ROOT}/bin/workflow-analyzer/dist/cli.js" <command>`, with an npx fallback if the bin doesn't exist (graceful degradation for users who haven't reinstalled yet).

- [ ] **Step 1: Update radar-analyze SKILL.md**

In `plugins/radar/skills/radar-analyze/SKILL.md`, replace the description line at line 11:

```
Uses the `@flippyhead/workflow-analyzer` npm package for session parsing and enrichment. Claude does the reasoning.
```

with:

```
Uses the bundled workflow-analyzer for session parsing and enrichment. Claude does the reasoning.
```

Replace the parse command at line 27:

```
npx @flippyhead/workflow-analyzer@latest parse --since ${DAYS} --output /tmp/workflow-analyzer-parsed.json
```

with:

```bash
# Bundled binary (preferred)
node "${CLAUDE_PLUGIN_ROOT}/bin/workflow-analyzer/dist/cli.js" parse --since ${DAYS} --output /tmp/workflow-analyzer-parsed.json

# Fallback if bin/ not available:
# npx @flippyhead/workflow-analyzer@latest parse --since ${DAYS} --output /tmp/workflow-analyzer-parsed.json
```

Replace the publish command at line 126:

```
npx @flippyhead/workflow-analyzer@latest publish --insights /tmp/workflow-analyzer-insights.json
```

with:

```bash
# Bundled binary (preferred)
node "${CLAUDE_PLUGIN_ROOT}/bin/workflow-analyzer/dist/cli.js" publish --insights /tmp/workflow-analyzer-insights.json

# Fallback if bin/ not available:
# npx @flippyhead/workflow-analyzer@latest publish --insights /tmp/workflow-analyzer-insights.json
```

- [ ] **Step 2: Update radar-scan SKILL.md**

In `plugins/radar/skills/radar-scan/SKILL.md`, replace the scan-deps command at line 62:

```
Run `npx @flippyhead/workflow-analyzer@latest scan-deps --since ${DAYS} --output /tmp/workflow-analyzer-deps.json`. Read the output JSON.
```

with:

```
Run `node "${CLAUDE_PLUGIN_ROOT}/bin/workflow-analyzer/dist/cli.js" scan-deps --since ${DAYS} --output /tmp/workflow-analyzer-deps.json`. Read the output JSON.
```

Also update the fallback text at line 64 to mention that if the bundled binary isn't available, fall back to `npx @flippyhead/workflow-analyzer@latest scan-deps ...`.

- [ ] **Step 3: Update radar-recommend SKILL.md**

In `plugins/radar/skills/radar-recommend/SKILL.md`, replace the parse command at line 44:

```
Run: `npx @flippyhead/workflow-analyzer@latest parse --since ${DAYS} --output /tmp/discover-sessions.json`
```

with:

```
Run: `node "${CLAUDE_PLUGIN_ROOT}/bin/workflow-analyzer/dist/cli.js" parse --since ${DAYS} --output /tmp/discover-sessions.json`
```

- [ ] **Step 4: Verify no remaining npx references**

```bash
grep -r "npx @flippyhead/workflow-analyzer" plugins/radar/skills/
```

Expected: Only the fallback comment lines should match, not any active commands.

- [ ] **Step 5: Commit**

```bash
git add plugins/radar/skills/
git commit -m "feat(radar): switch skills from npx to bundled bin/ binary"
```

---

### Task 4: Handle .gitignore for bin/ Dependencies

**Files:**
- Create: `plugins/radar/bin/workflow-analyzer/.gitignore`

We want to commit the compiled `dist/` (so the plugin works without a build step) but NOT `node_modules/` (installed by the post-install hook).

- [ ] **Step 1: Create .gitignore for the bin directory**

The `.gitignore` copied from the workflow-analyzer repo should already have `node_modules`. Verify it exists and contains at minimum:

```
node_modules/
```

Make sure `dist/` is NOT in `.gitignore` (it needs to be committed for plugin distribution).

- [ ] **Step 2: Verify dist/ is tracked and node_modules/ is not**

```bash
cd plugins/radar/bin/workflow-analyzer
git status
```

Expected: `dist/` files are tracked. `node_modules/` is not listed.

- [ ] **Step 3: Commit if any .gitignore changes were needed**

```bash
git add plugins/radar/bin/workflow-analyzer/.gitignore
git commit -m "chore(radar): ensure bin/ gitignore excludes node_modules, includes dist"
```

---

### Task 5: Bump Version

**Files:**
- Modify: `plugins/radar/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `.claude-plugin/plugin.json`

This is a minor version bump — new feature (bundled binary), no breaking changes.

- [ ] **Step 1: Run the bump script**

```bash
./scripts/bump-version.sh radar 3.1.0
```

Expected output:
```
Updated plugins/radar/.claude-plugin/plugin.json → 3.1.0
Updated .claude-plugin/marketplace.json (radar) → 3.1.0
Updated .claude-plugin/plugin.json → 3.1.0
```

- [ ] **Step 2: Verify the changes**

```bash
git diff
```

Expected: Three JSON files updated with version `3.1.0`.

- [ ] **Step 3: Commit**

```bash
git add .claude-plugin/ plugins/radar/.claude-plugin/
git commit -m "chore(radar): bump version to 3.1.0"
```

---

### Task 6: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the repo structure section**

In `CLAUDE.md`, update the repo structure to reflect the new `bin/` directory:

```
plugins/
  radar/                 — workflow intelligence plugin
    .claude-plugin/      — per-plugin plugin.json
    .mcp.json            — MCP server config (ai-brain HTTP connector, optional)
    bin/
      workflow-analyzer/ — bundled CLI (source + compiled dist)
    hooks/               — hooks.json + first-run.mjs + install.mjs
    skills/
      radar/SKILL.md             — combined scan + recommend
      radar-analyze/SKILL.md     — session analysis
      radar-scan/SKILL.md        — external source scanning
      radar-recommend/SKILL.md   — personalized recommendations
```

- [ ] **Step 2: Update the external dependency note**

Replace:

```
**External dependency**: Radar skills shell out to `npx @flippyhead/workflow-analyzer@latest` for session parsing, insight publishing, and dependency scanning. This is a separate npm package.
```

with:

```
**Bundled tooling**: The workflow-analyzer CLI is bundled under `plugins/radar/bin/workflow-analyzer/`. Skills invoke it via `node "${CLAUDE_PLUGIN_ROOT}/bin/workflow-analyzer/dist/cli.js"`. Dependencies are installed by the PluginInstall hook. The tool is also published as `@flippyhead/workflow-analyzer` on npm (legacy distribution).
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for bundled workflow-analyzer"
```

---

### Task 7: End-to-End Verification

- [ ] **Step 1: Verify the bundled CLI works for all three commands**

```bash
CLAUDE_PLUGIN_ROOT=/Users/peterbrown/Development/radar/plugins/radar

# parse
node "$CLAUDE_PLUGIN_ROOT/bin/workflow-analyzer/dist/cli.js" parse --since 3 --output /tmp/test-parse.json
cat /tmp/test-parse.json | head -5

# scan-deps
node "$CLAUDE_PLUGIN_ROOT/bin/workflow-analyzer/dist/cli.js" scan-deps --since 7 --output /tmp/test-deps.json
cat /tmp/test-deps.json | head -5

# publish (with a dummy insights file)
echo '{"insights":[],"metadata":{"period":{"since":"2026-04-01","until":"2026-04-04"},"sessionCount":0,"sources":[],"modulesRun":[]}}' > /tmp/test-insights.json
node "$CLAUDE_PLUGIN_ROOT/bin/workflow-analyzer/dist/cli.js" publish --insights /tmp/test-insights.json
```

Expected: All three commands execute without errors.

- [ ] **Step 2: Run the full test suite**

```bash
cd plugins/radar/bin/workflow-analyzer
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Verify no skill references the old npx pattern as a primary command**

```bash
grep -rn "^npx\|^Run.*npx\|^\`npx" plugins/radar/skills/
```

Expected: No matches (only commented-out fallback lines).

---

## Future Tasks (Not in This Plan)

These were identified in the radar scan but are separate efforts:

1. **Add `maxResultSizeChars` annotations to Open Brain MCP responses** — separate PR, touches the ai-brain server (different repo)
2. **Migrate workflow-analyzer to Claude Agent SDK** — larger refactor, replace `commander` CLI with Agent SDK tool definitions, add `typing.Annotated` parameter descriptions. Do after the in-housing is stable.
3. **Handle `disableSkillShellExecution`** — once Agent SDK migration is done, the CLI invocation disappears entirely. Until then, the bundled binary is still a shell command but at least doesn't require network access (no npx).
