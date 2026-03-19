# Claude Workflow Analyst

## Version Management

**ALWAYS bump the version when making changes that affect plugin behavior.**

This is a multi-plugin marketplace repo. Version numbers live in three places and must stay in sync:

1. `.claude-plugin/plugin.json` — root plugin version
2. `.claude-plugin/marketplace.json` — version for each plugin listed
3. `plugins/<plugin-name>/.claude-plugin/plugin.json` — per-plugin version

When you change a plugin's skills, hooks, MCP config, or plugin.json metadata:

- Bump the **patch** version for bug fixes (2.1.0 → 2.1.1)
- Bump the **minor** version for new features or skill changes (2.1.0 → 2.2.0)
- Bump the **major** version for breaking changes (2.1.0 → 3.0.0)
- Update ALL three files to keep versions consistent
- If only one plugin changed, bump that plugin's version in marketplace.json and its own plugin.json, plus the root plugin.json

## Repo Structure

```
.claude-plugin/          — root plugin config + marketplace listing
plugins/
  workflow-analyst/      — workflow analysis skill
  open-brain/            — brain-init, brain-sync, weekly-review skills + hooks
```
