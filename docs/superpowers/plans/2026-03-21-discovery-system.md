# Discovery System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-skill discovery system (scout + discover) that catalogues AI tools/features from external sources and matches them against the user's goals and usage patterns.

**Architecture:** Enriched list items in ai-brain provide the storage foundation (3 optional fields added to listItems). Two new skills in the workflow-analyst plugin — `/scout` builds the catalogue from web sources and user submissions, `/discover` matches catalogue entries against personal context to surface recommendations. Both use brain MCP if available, local JSON fallback otherwise.

**Tech Stack:** Convex (ai-brain backend), TypeScript, Claude Code skills (SKILL.md), MCP tools, WebSearch/WebFetch

**Spec:** `docs/superpowers/specs/2026-03-21-discovery-system-design.md`

---

## File Structure

### ai-brain repo (`/Users/peterbrown/Development/ai-brain`)

**Modified files:**
- `packages/convex/convex/models/lists/validators.ts` — add 3 optional fields to listItemFields
- `packages/convex/convex/models/lists/model.ts` — update _insertItem and _updateItem signatures
- `packages/convex/convex/models/lists/private.ts` — update internal mutations
- `packages/convex/convex/models/lists/mcpActions.ts` — update createListItem and updateListItem
- `packages/convex/convex/models/lists/mcpQueries.ts` — update getList and getOpenItems responses
- `apps/web/src/lib/mcp/server.ts` — update Zod schemas and type definitions

### claude-workflow-analyst repo (`/Users/peterbrown/Development/claude-workflow-analyst`)

**New files:**
- `plugins/workflow-analyst/skills/scout/SKILL.md` — scout skill
- `plugins/workflow-analyst/skills/discover/SKILL.md` — discover skill

**Modified files:**
- `.claude-plugin/plugin.json` — version bump 2.1.0 → 2.2.0
- `.claude-plugin/marketplace.json` — version bump for workflow-analyst
- `plugins/workflow-analyst/.claude-plugin/plugin.json` — version bump 2.1.0 → 2.2.0

---

## Task 1: Add optional fields to listItems validator

**Repo:** ai-brain
**Files:**
- Modify: `packages/convex/convex/models/lists/validators.ts:15-22`

- [ ] **Step 1: Add url, description, properties fields to listItemFields**

In `packages/convex/convex/models/lists/validators.ts`, add three optional fields to the `listItemFields` object:

```typescript
export const listItemFields = {
  title: v.string(),
  status: listItemStatus,
  position: v.number(),
  listId: v.id("lists"),
  userId: v.id("users"),
  completedAt: v.optional(v.number()),
  url: v.optional(v.string()),
  description: v.optional(v.string()),
  properties: v.optional(v.record(v.string(), v.any())),
};
```

- [ ] **Step 2: Verify schema compiles**

Run: `cd /Users/peterbrown/Development/ai-brain && pnpm --filter convex exec npx convex dev --once --typecheck disable` or the equivalent type check command.
Expected: No errors. Schema auto-picks up the new fields from listItemFields.

**Note:** `v.record(v.string(), v.any())` is a new validator pattern for this codebase (existing unstructured fields use `v.any()`). If the schema push fails with `v.record`, fall back to `properties: v.optional(v.any())` and update all downstream tasks accordingly.

- [ ] **Step 3: Commit**

```bash
cd /Users/peterbrown/Development/ai-brain
git add packages/convex/convex/models/lists/validators.ts
git commit -m "feat(lists): add url, description, properties fields to listItems"
```

---

## Task 2: Update model layer (_insertItem, _updateItem)

**Repo:** ai-brain
**Files:**
- Modify: `packages/convex/convex/models/lists/model.ts:96-120`

- [ ] **Step 1: Update _insertItem signature**

In `model.ts`, update the `_insertItem` function's `fields` parameter to include the new optional fields:

```typescript
export async function _insertItem(
  ctx: MutationCtx,
  fields: {
    title: string;
    status: "open" | "done";
    position: number;
    listId: Id<"lists">;
    userId: Id<"users">;
    url?: string;
    description?: string;
    properties?: Record<string, unknown>;
  },
) {
  return await ctx.db.insert("listItems", fields);
}
```

- [ ] **Step 2: Update _updateItem signature**

In `model.ts`, update the `_updateItem` function's `fields` parameter:

```typescript
export async function _updateItem(
  ctx: MutationCtx,
  id: Id<"listItems">,
  fields: Partial<{
    title: string;
    status: "open" | "done";
    position: number;
    completedAt: number | undefined;
    url: string | undefined;
    description: string | undefined;
    properties: Record<string, unknown> | undefined;
  }>,
) {
  await ctx.db.patch(id, fields);
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/peterbrown/Development/ai-brain
git add packages/convex/convex/models/lists/model.ts
git commit -m "feat(lists): update model layer for enriched list items"
```

---

## Task 3: Update internal mutations (private.ts)

**Repo:** ai-brain
**Files:**
- Modify: `packages/convex/convex/models/lists/private.ts:111-145`

- [ ] **Step 1: Update insertItem internal mutation args**

In `private.ts`, add the 3 optional fields to the `insertItem` mutation args:

```typescript
export const insertItem = internalMutation({
  args: {
    title: v.string(),
    status: listItemStatus,
    position: v.number(),
    listId: v.id("lists"),
    userId: v.id("users"),
    url: v.optional(v.string()),
    description: v.optional(v.string()),
    properties: v.optional(v.record(v.string(), v.any())),
  },
  returns: v.id("listItems"),
  handler: async (ctx, args) => {
    return await _insertItem(ctx, args);
  },
});
```

- [ ] **Step 2: Update updateItem internal mutation args and handler**

Add the 3 optional fields to args, and add handling logic in the handler:

```typescript
export const updateItem = internalMutation({
  args: {
    id: v.id("listItems"),
    title: v.optional(v.string()),
    status: v.optional(listItemStatus),
    position: v.optional(v.number()),
    completedAt: v.optional(v.union(v.number(), v.null())),
    url: v.optional(v.string()),
    description: v.optional(v.string()),
    properties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const update: Record<string, unknown> = {};
    if (fields.title !== undefined) update.title = fields.title;
    if (fields.status !== undefined) update.status = fields.status;
    if (fields.position !== undefined) update.position = fields.position;
    if (fields.completedAt !== undefined) {
      update.completedAt =
        fields.completedAt === null ? undefined : fields.completedAt;
    }
    if (fields.url !== undefined) update.url = fields.url;
    if (fields.description !== undefined) update.description = fields.description;
    if (fields.properties !== undefined) update.properties = fields.properties;
    await _updateItem(ctx, id, update);
  },
});
```

- [ ] **Step 3: Commit**

```bash
cd /Users/peterbrown/Development/ai-brain
git add packages/convex/convex/models/lists/private.ts
git commit -m "feat(lists): update internal mutations for enriched list items"
```

---

## Task 4: Update MCP mutations (mcpActions.ts)

**Repo:** ai-brain
**Files:**
- Modify: `packages/convex/convex/models/lists/mcpActions.ts:71-143`

- [ ] **Step 1: Update createListItem mutation**

Add the 3 optional fields to args, pass them through to _insertItem, and include in the return:

```typescript
export const createListItem = mutation({
  args: {
    userId: v.id("users"),
    listId: v.id("lists"),
    title: v.string(),
    url: v.optional(v.string()),
    description: v.optional(v.string()),
    properties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const list = await _findListById(ctx, args.listId);
    if (!list || list.userId !== args.userId) {
      throw new Error("List not found");
    }

    const items = await _itemsByList(ctx, args.listId, { includeCompleted: true });
    const maxPosition = items.length > 0
      ? Math.max(...items.map((i) => i.position))
      : 0;

    const itemId = await _insertItem(ctx, {
      title: args.title,
      status: "open",
      position: maxPosition + 1,
      listId: args.listId,
      userId: args.userId,
      url: args.url,
      description: args.description,
      properties: args.properties,
    });

    return {
      itemId,
      title: args.title,
      status: "open" as const,
      position: maxPosition + 1,
      url: args.url,
      description: args.description,
      properties: args.properties,
    };
  },
});
```

- [ ] **Step 2: Update updateListItem mutation**

Add the 3 optional fields to args, handle them in the update logic, and include in the return:

```typescript
export const updateListItem = mutation({
  args: {
    userId: v.id("users"),
    itemId: v.id("listItems"),
    title: v.optional(v.string()),
    status: v.optional(listItemStatus),
    position: v.optional(v.number()),
    url: v.optional(v.string()),
    description: v.optional(v.string()),
    properties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const item = await _findItemById(ctx, args.itemId);
    if (!item || item.userId !== args.userId) {
      throw new Error("Item not found");
    }

    const update: Record<string, unknown> = {};
    if (args.title !== undefined) update.title = args.title;
    if (args.position !== undefined) update.position = args.position;
    if (args.url !== undefined) update.url = args.url;
    if (args.description !== undefined) update.description = args.description;
    if (args.properties !== undefined) update.properties = args.properties;

    if (args.status !== undefined) {
      update.status = args.status;
      if (args.status === "done") {
        update.completedAt = Date.now();
      } else {
        update.completedAt = undefined;
      }
    }

    await _updateItem(ctx, args.itemId, update);

    return {
      itemId: args.itemId,
      title: args.title ?? item.title,
      status: args.status ?? item.status,
      position: args.position ?? item.position,
      completedAt: args.status !== undefined ? update.completedAt : item.completedAt,
      url: args.url ?? item.url,
      description: args.description ?? item.description,
      properties: args.properties ?? item.properties,
    };
  },
});
```

- [ ] **Step 3: Commit**

```bash
cd /Users/peterbrown/Development/ai-brain
git add packages/convex/convex/models/lists/mcpActions.ts
git commit -m "feat(lists): update MCP mutations for enriched list items"
```

---

## Task 5: Update MCP queries (mcpQueries.ts)

**Repo:** ai-brain
**Files:**
- Modify: `packages/convex/convex/models/lists/mcpQueries.ts:40-115`

- [ ] **Step 1: Update getList response to include new fields**

In `mcpQueries.ts`, update the `items.map()` in the `getList` handler to include the new fields:

```typescript
      items: items.map((item) => ({
        itemId: item._id,
        title: item.title,
        status: item.status,
        position: item.position,
        completedAt: item.completedAt,
        url: item.url,
        description: item.description,
        properties: item.properties,
      })),
```

- [ ] **Step 2: Update getOpenItems response to include new fields**

Update the `results.push()` in the `getOpenItems` handler:

```typescript
        results.push({
          itemId: item._id,
          title: item.title,
          position: item.position,
          listId: item.listId,
          listName: listInfo.name,
          url: item.url,
          description: item.description,
          properties: item.properties,
        });
```

- [ ] **Step 3: Verify get_lists returns list names**

Read the `getLists` query in `mcpQueries.ts` and confirm it returns the `name` field for each list. This is needed for scout to match lists by `[Scout]` prefix. If it doesn't, add it.

- [ ] **Step 4: Commit**

```bash
cd /Users/peterbrown/Development/ai-brain
git add packages/convex/convex/models/lists/mcpQueries.ts
git commit -m "feat(lists): include enriched fields in MCP query responses"
```

---

## Task 6: Update MCP server Zod schemas (server.ts)

**Repo:** ai-brain
**Files:**
- Modify: `apps/web/src/lib/mcp/server.ts` (around lines 487-629)

- [ ] **Step 1: Update createListItem tool Zod schema**

Find the `createListItem` tool definition (around line 550). Add the 3 optional params to the Zod schema and pass them through:

```typescript
  server.tool(
    MCP_TOOL_NAMES.createListItem,
    "Add an item to a list",
    {
      listId: z.string().describe("The list to add the item to"),
      title: z.string().describe("The item text"),
      url: z.string().optional().describe("Optional URL for the item"),
      description: z.string().optional().describe("Optional description of the item"),
      properties: z.record(z.string(), z.any()).optional().describe("Optional custom properties object"),
    },
    async ({ listId, title, url, description, properties }) => {
      const result = await convex.mutation(
        api.models.lists.mcpActions.createListItem,
        { userId: userId as never, listId: listId as never, title, url, description, properties },
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Added: "${result.title}" (id: ${result.itemId})`,
          },
        ],
      };
    },
  );
```

- [ ] **Step 2: Update updateListItem tool Zod schema**

Find the `updateListItem` tool definition (around line 572). Add the 3 optional params:

```typescript
  server.tool(
    MCP_TOOL_NAMES.updateListItem,
    "Update a list item — change title, mark done/open, or reorder",
    {
      itemId: z.string().describe("The item ID to update"),
      title: z.string().optional().describe("New title text"),
      status: z
        .enum(["open", "done"])
        .optional()
        .describe("Set status (done = check off, open = reopen)"),
      position: z
        .number()
        .optional()
        .describe("New position for reordering"),
      url: z.string().optional().describe("New URL for the item"),
      description: z.string().optional().describe("New description for the item"),
      properties: z.record(z.string(), z.any()).optional().describe("Custom properties object (replaces entire properties field — caller should merge with existing before sending)"),
    },
    async ({ itemId, title, status, position, url, description, properties }) => {
      const result = await convex.mutation(
        api.models.lists.mcpActions.updateListItem,
        {
          userId: userId as never,
          itemId: itemId as never,
          title,
          status,
          position,
          url,
          description,
          properties,
        },
      );

      const statusText = result.status === "done" ? " [done]" : "";
      return {
        content: [
          {
            type: "text" as const,
            text: `Updated: "${result.title}"${statusText}`,
          },
        ],
      };
    },
  );
```

- [ ] **Step 3: Update TypeScript type definitions**

Update the `ListDetail` type (around line 487) to include new fields in items array:

```typescript
      type ListDetail = {
        listId: string;
        name: string;
        pinned: boolean;
        items: Array<{
          itemId: string;
          title: string;
          status: string;
          position: number;
          completedAt?: number;
          url?: string;
          description?: string;
          properties?: Record<string, unknown>;
        }>;
      };
```

Update the `OpenItem` type (around line 623):

```typescript
      type OpenItem = {
        itemId: string;
        title: string;
        position: number;
        listId: string;
        listName: string;
        url?: string;
        description?: string;
        properties?: Record<string, unknown>;
      };
```

- [ ] **Step 4: Update getList tool response formatting to include enriched fields**

The `getList` tool handler (around line 504) formats items as human-readable text with checkboxes. The new fields must be included in the text output, otherwise MCP clients (like scout/discover) cannot see them. Update the item formatting in the getList handler to include url and description when present. For example:

```typescript
// In the getList handler's item formatting:
const itemLines = result.items.map((item) => {
  const check = item.status === "done" ? "x" : " ";
  let line = `[${check}] ${item.title} (id: ${item.itemId})`;
  if (item.url) line += `\n    URL: ${item.url}`;
  if (item.description) line += `\n    ${item.description}`;
  if (item.properties) line += `\n    Properties: ${JSON.stringify(item.properties)}`;
  return line;
});
```

Apply the same pattern to the `getOpenItems` handler (around line 650) — include url, description, and properties in the text output for each item.

- [ ] **Step 5: Verify it compiles**

Run: `cd /Users/peterbrown/Development/ai-brain && pnpm --filter web build` (or `tsc --noEmit`)
Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/peterbrown/Development/ai-brain
git add apps/web/src/lib/mcp/server.ts
git commit -m "feat(mcp): update Zod schemas and types for enriched list items"
```

---

## Task 7: Deploy ai-brain changes

**Repo:** ai-brain

- [ ] **Step 1: Push and deploy**

Push the ai-brain changes. Convex schema changes deploy automatically (or via `npx convex deploy`). The MCP server changes deploy via Vercel.

```bash
cd /Users/peterbrown/Development/ai-brain
git push
```

- [ ] **Step 2: Verify MCP tools accept new fields**

Use the ai-brain MCP tools to test:
1. Create a test list: `create_list` with name `[Scout] Test`
2. Create an item with enriched fields: `create_list_item` with title "Test item", url "https://example.com", description "A test", properties `{"category": "test"}`
3. Read it back: `get_list` and verify url/description/properties are in the response
4. Clean up: archive the test list using `archive_list` (there is no delete MCP tool)

- [ ] **Step 3: Commit any fixes if needed**

---

## Task 8: Write the Scout skill

**Repo:** claude-workflow-analyst
**Files:**
- Create: `plugins/workflow-analyst/skills/scout/SKILL.md`

- [ ] **Step 1: Create the scout skill directory**

```bash
mkdir -p /Users/peterbrown/Development/claude-workflow-analyst/plugins/workflow-analyst/skills/scout
```

- [ ] **Step 2: Write SKILL.md**

Create `plugins/workflow-analyst/skills/scout/SKILL.md` with the full skill definition. The content should follow the spec at `docs/superpowers/specs/2026-03-21-discovery-system-design.md`, Part 2. Use the existing `workflow-analyst/SKILL.md` as a structural reference for formatting.

```markdown
---
name: scout
description: Build a catalogue of AI tools, features, and techniques from external sources. Scans changelogs, HN, GitHub, and your inbox.
argument-hint: [--sources <all|feeds|manual>] [--days N]
---

# Scout — AI Discovery Catalogue Builder

Build and maintain a catalogue of AI tools, features, and techniques from external sources. Runs independently of your personal context.

## Arguments

- `$ARGUMENTS` — Optional:
  - `--sources <all|feeds|manual>` — Which sources to scan (default: all)
  - `--days N` — How far back to look in time-based sources (default: 7)

Parse from `$ARGUMENTS` if provided. Default to `--sources all --days 7`.

## Workflow

### Step 1: Check/Create Catalogue Lists

Check if the ai-brain MCP tools are available (try calling `get_lists`).

**If brain MCP is available:**

Call `get_lists` and look for lists with names starting with `[Scout]`. Create any that are missing:
- `[Scout] Inbox` — raw links dropped by user for enrichment
- `[Scout] Claude Code` — features, settings, tips
- `[Scout] MCP Ecosystem` — servers, plugins, integrations
- `[Scout] AI Tools & Techniques` — broader tools, prompting, workflows

Use `create_list` for each missing list.

**If brain MCP is unavailable:**

Use local JSON file at `~/.claude/scout-catalogue.json`. Read it if it exists, or initialize with empty structure:

```json
{
  "lists": {
    "[Scout] Inbox": { "items": [] },
    "[Scout] Claude Code": { "items": [] },
    "[Scout] MCP Ecosystem": { "items": [] },
    "[Scout] AI Tools & Techniques": { "items": [] }
  },
  "lastUpdated": null
}
```

### Step 2: Load Existing Catalogue

Load all items from `[Scout]` lists to build a set of known URLs for deduplication.

**Brain mode:** Call `get_list` for each `[Scout]` list. Collect all item URLs into a set.
**Local mode:** Read from the JSON file.

### Step 3: Scan Structured Sources

Skip this step if `--sources manual` was specified.

Limit to **10-15 items per source**. If a source fails (timeout, rate limit, format change), log a warning and continue to the next source — never fail the entire run.

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

### Step 4: Process Inbox Items

Skip this step if `--sources feeds` was specified.

**Brain mode:** Call `get_list` for the `[Scout] Inbox` list. For each item with status "open":

1. If the item has a URL, use `WebFetch` to get the page content
2. Summarize what it is and why it might be useful (1-2 sentences) — set as `description`
3. Classify it (see Step 5 for category/tag schema)
4. Create a new item in the appropriate `[Scout]` category list using `create_list_item` with the enriched fields
5. Mark the inbox item as "done" using `update_list_item`

**Local mode:** Process items in the Inbox array, move to the appropriate category array.

### Step 5: Enrich and Tag

For each new catalogue entry (from Step 3 or Step 4), set the `properties` field:

```json
{
  "category": "<one of: claude-code, mcp, api, agent-sdk, prompting, tooling, workflow, general-ai>",
  "relevanceHints": ["<free-text tags describing what workflows/goals this helps with>"],
  "source": "<one of: anthropic-changelog, hackernews, github, youtube, manual>",
  "discoveredAt": "<ISO date>"
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

Choose `relevanceHints` based on what kinds of work this would help with (e.g., "browser automation", "code review", "testing", "deployment", "project management").

**Brain mode:** Use `create_list_item` with url, description, and properties set.
**Local mode:** Append to the appropriate list in the JSON file. Write the file when done.

### Step 6: Report

Output a brief summary:
- How many new items were catalogued, by source
- How many inbox items were processed
- How many duplicates were skipped
- The 3-5 most notable new finds (title + one-line description)
- Total catalogue size across all `[Scout]` lists
```

- [ ] **Step 3: Commit**

```bash
cd /Users/peterbrown/Development/claude-workflow-analyst
git add plugins/workflow-analyst/skills/scout/SKILL.md
git commit -m "feat: add scout skill for AI discovery catalogue building"
```

---

## Task 9: Write the Discover skill

**Repo:** claude-workflow-analyst
**Files:**
- Create: `plugins/workflow-analyst/skills/discover/SKILL.md`

- [ ] **Step 1: Create the discover skill directory**

```bash
mkdir -p /Users/peterbrown/Development/claude-workflow-analyst/plugins/workflow-analyst/skills/discover
```

- [ ] **Step 2: Write SKILL.md**

Create `plugins/workflow-analyst/skills/discover/SKILL.md` with the full skill definition. Follow the spec Part 3.

```markdown
---
name: discover
description: Match catalogued AI tools and techniques against your goals and usage patterns. Surfaces personalized recommendations.
argument-hint: [--days N] [--focus <category>]
---

# Discover — Personalized AI Recommendations

Match the scout catalogue against your personal context — goals, usage patterns, current projects, and installed tools — to surface what you should be paying attention to.

## Arguments

- `$ARGUMENTS` — Optional:
  - `--days N` — How far back to look at session history (default: 14)
  - `--focus <category>` — Filter to a specific category (claude-code, mcp, api, agent-sdk, prompting, tooling, workflow, general-ai)

Parse from `$ARGUMENTS` if provided.

## Workflow

### Step 1: Load the Catalogue

**Brain mode:** Call `get_lists` and find all lists with names starting with `[Scout]` (excluding `[Scout] Inbox`). For each, call `get_list` and collect all items with status "open".

**Local mode:** Read `~/.claude/scout-catalogue.json` and collect all items with status "open" across all lists (excluding Inbox).

If the catalogue is empty, tell the user: "No catalogue entries found. Run `/scout` first to build your discovery catalogue."

If `--focus` was specified, filter items to only those with matching `properties.category`.

### Step 2: Load Personal Context

Pull from multiple sources. Each is optional — work with whatever is available.

**Brain goals:**
Call `get_lists` with `pinned: true` to get the user's stated goals and priorities. Extract goal titles and descriptions.

**Brain thoughts:**
Call `browse_recent` with a generous `limit` (e.g., 50) to get recent thoughts. Note: `browse_recent` does not support date filtering — it returns the N most recent thoughts regardless of date. Filter results client-side by checking each thought's creation date, keeping only those from the last 14 days. Note recurring topics and themes.

**Session history:**
Run: `npx @flippyhead/workflow-analyzer@latest parse --since ${DAYS} --output /tmp/discover-sessions.json`

Read the output file. If session history exceeds 50 sessions, summarize the top patterns:
- Most-used tools (top 10)
- Most-active projects (by session count)
- Recurring topics in user prompts
- Tool failure patterns

**Current environment:**
- Read `~/.claude/settings.json` for installed permissions and allowed tools
- Look for `.mcp.json` files in the home directory and current project for installed MCP servers
- Check `~/.claude/plugins/` for installed plugins

### Step 3: Match and Rank

For each open catalogue item, evaluate against the loaded context. Score on four dimensions:

**Goal alignment (0-3):**
- 3: Directly addresses a pinned goal
- 2: Related to a goal's domain
- 1: Tangentially useful
- 0: No connection

**Usage gap (0-3):**
- 3: User is doing something manually that this automates (evidence in session data)
- 2: User is using a tool that has a better/newer alternative
- 1: User works in the relevant domain but hasn't needed this yet
- 0: No gap identified

**Recency (0-2):**
- 2: Released in the last 7 days
- 1: Released in the last 30 days, or newly relevant due to a recently started project
- 0: Older

**Effort/impact (0-2):**
- 2: Low effort, high impact (e.g., a config change or install command)
- 1: Medium effort or medium impact
- 0: High effort or low impact

**Total score: 0-10.** Skip items scoring below 3 — they don't connect to the user's context meaningfully.

### Step 4: Present Recommendations

Sort by total score descending. Group into tiers:

**Act Now** (score 7-10):
Items with high relevance and low effort. Lead with what the user is doing that this improves. Format:

> **[Title]** (score: N/10)
> You're [specific observation from session data or goals]. [This tool/feature] [specific benefit].
> **Next step:** [concrete action — install command, link to try, config change]

**Worth Exploring** (score 5-6):
Items with high relevance but higher effort. Format:

> **[Title]** (score: N/10)
> Given your goal of [goal], this [what it does]. Worth a deeper look when [suggested timing].
> **Link:** [url]

**On Your Radar** (score 3-4):
Items with moderate relevance. Brief format:

> **[Title]** — [one sentence on what it is and why it might matter] ([url])

Limit output to:
- Act Now: up to 5 items
- Worth Exploring: up to 5 items
- On Your Radar: up to 5 items

If no items score above 3, report: "Nothing in the current catalogue connects strongly to your goals and usage patterns. The catalogue may need more entries — try running `/scout` or adding items to `[Scout] Inbox`."

### Step 5: Update Catalogue State

For each item that was recommended, update its properties to include:
- `lastRecommended`: today's ISO date
- `matchedGoals`: array of goal titles it matched against
- `matchedPatterns`: array of usage patterns that triggered the match

**Brain mode:** The `update_list_item` MCP tool replaces the entire `properties` field — it does NOT merge. So you must: (1) read the item's existing properties from the `get_list` response, (2) merge the new keys (`lastRecommended`, `matchedGoals`, `matchedPatterns`) into the existing properties object client-side, (3) send the full merged object to `update_list_item`.
**Local mode:** Update the JSON file (same merge-then-write approach).

Items with `lastRecommended` within the last 14 days should be deprioritized (reduce score by 2) on subsequent runs to avoid re-surfacing the same recommendations.

### Step 6: Optionally Save to Brain

If brain MCP is available, offer:

"Want me to save a discovery digest to your brain? This helps weekly-review track what's been recommended."

If yes, call `capture_thought` with:
"Discovery digest (${date}): Reviewed ${N} catalogue items against ${M} goals. Top recommendations: [1-2 sentence summary of Act Now items]. Key themes: [categories with highest scores]."
```

- [ ] **Step 3: Commit**

```bash
cd /Users/peterbrown/Development/claude-workflow-analyst
git add plugins/workflow-analyst/skills/discover/SKILL.md
git commit -m "feat: add discover skill for personalized AI recommendations"
```

---

## Task 10: Version bumps and final commit

**Repo:** claude-workflow-analyst
**Files:**
- Modify: `.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `plugins/workflow-analyst/.claude-plugin/plugin.json`

- [ ] **Step 1: Bump root plugin.json to 2.2.0**

In `.claude-plugin/plugin.json`, change version from `"2.1.0"` to `"2.2.0"`.

- [ ] **Step 2: Bump marketplace.json workflow-analyst version to 2.2.0**

In `.claude-plugin/marketplace.json`, change the workflow-analyst plugin version from `"2.1.0"` to `"2.2.0"`.

- [ ] **Step 3: Bump workflow-analyst plugin.json to 2.2.0**

In `plugins/workflow-analyst/.claude-plugin/plugin.json`, change version from `"2.1.0"` to `"2.2.0"`.

- [ ] **Step 4: Commit version bumps**

```bash
cd /Users/peterbrown/Development/claude-workflow-analyst
git add .claude-plugin/plugin.json .claude-plugin/marketplace.json plugins/workflow-analyst/.claude-plugin/plugin.json
git commit -m "chore: bump workflow-analyst to 2.2.0 for scout and discover skills"
```

---

## Task 11: Manual smoke test

- [ ] **Step 1: Test scout skill**

Run `/scout --days 3` in a Claude Code session with the plugin installed. Verify:
- Catalogue lists are created in brain (or local JSON)
- Items are catalogued with url, description, and properties
- Deduplication works on second run
- Report shows item counts

- [ ] **Step 2: Test discover skill**

Run `/discover` in a Claude Code session. Verify:
- Catalogue is loaded
- Personal context is gathered (goals, session history, environment)
- Recommendations are grouped into tiers with scores
- Items are relevant to actual goals/usage
- Catalogue state is updated with lastRecommended

- [ ] **Step 3: Test inbox flow**

Add a raw link to `[Scout] Inbox` via brain UI or `create_list_item`. Run `/scout --sources manual`. Verify:
- Inbox item is fetched and enriched
- Item is moved to appropriate category list
- Inbox item is marked done
