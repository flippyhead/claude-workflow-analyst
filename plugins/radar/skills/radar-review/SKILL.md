---
name: radar-review
description: Review your radar catalogue in a local web UI — browse, star, dismiss, annotate, and filter discovered tools and insights.
argument-hint: (no arguments)
---

# Radar Review — Catalogue Review Interface

Launches a tiny local web server and opens the Radar review UI in the user's default browser. The UI lets them star, dismiss, annotate, and filter catalogue items with the full set of filter chips, tier grouping, and score breakdowns.

**This skill is self-contained — it does not depend on or use the Open Brain plugin, ai-brain MCP, or any external memory service. All data comes from `~/.claude/radar/catalogue.json` and stays local.**

## Workflow

### Step 1: Check Catalogue Exists

Verify `~/.claude/radar/catalogue.json` exists. If it does not, tell the user: "No catalogue found. Run `/radar-scan` first to discover tools and techniques." Stop here.

### Step 2: Launch the Server

Run the bundled server in the background:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/review-server/server.mjs"
```

Use `run_in_background: true`. Capture the `bash_id` so you can read output later.

Read the background output until you see a line starting with `RADAR_REVIEW_URL `. Extract the URL (everything after that prefix). The server also attempts to auto-open the URL in the default browser.

Tell the user:

> Radar review is running at <URL>. Browser should have opened automatically — if not, click that URL. Click **Done** in the UI (or say "done" here) when you're finished.

### Step 3: Wait for the Session to End

Wait for the user to either:
- Click the "Done" button in the UI (which POSTs `/api/exit` and the server exits cleanly)
- Say "done", "finished", "exit", or similar
- Ask you to stop the server

Periodically read the background output. When the server exits, it prints a line starting with `RADAR_SESSION_SUMMARY ` followed by a JSON object with session counts.

If the user says "done" but the server is still running, make a quick `curl -sS -X POST http://127.0.0.1:<PORT>/api/exit` call to trigger graceful shutdown (use the URL extracted in Step 2).

### Step 4: Report Summary

Parse the `RADAR_SESSION_SUMMARY` JSON line. Output a concise summary:

```
Review session complete:
- Items starred: N
- Items dismissed: N
- Items reviewed: N
- Items acted on: N
- Notes added: N
```

Skip lines with zero counts. If no `RADAR_SESSION_SUMMARY` line was found (e.g., server crashed), just say "Review session ended."
