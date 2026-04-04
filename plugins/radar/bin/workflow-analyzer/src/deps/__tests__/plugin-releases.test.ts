import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchPluginUpdates } from "../plugin-releases.js";
import { PluginInput } from "../types.js";

const makeDedicatedPlugin = (overrides?: Partial<PluginInput>): PluginInput => ({
  name: "superpowers",
  marketplace: "claude-plugins-official",
  repo: "obra/superpowers",
  repoPath: null,
  installedVersion: "5.0.5",
  gitCommitSha: "abc123",
  ...overrides,
});

const makeMonorepoPlugin = (overrides?: Partial<PluginInput>): PluginInput => ({
  name: "figma",
  marketplace: "claude-plugins-official",
  repo: "anthropics/claude-plugins-official",
  repoPath: "plugins/figma",
  installedVersion: "2.0.2",
  gitCommitSha: "def456",
  ...overrides,
});

describe("fetchPluginUpdates", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  });

  it("fetches releases for dedicated-repo plugins", async () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () =>
        Promise.resolve([
          {
            tag_name: "v5.1.0",
            name: "Release 5.1.0",
            published_at: twoDaysAgo.toISOString(),
            body: "Bug fixes and improvements",
            html_url: "https://github.com/obra/superpowers/releases/tag/v5.1.0",
          },
        ]),
    }) as any;

    const result = await fetchPluginUpdates([makeDedicatedPlugin()], 7);

    expect(result.releases).toHaveLength(1);
    expect(result.releases[0].sourceType).toBe("plugin");
    expect(result.releases[0].installedVersion).toBe("5.0.5");
    expect(result.releases[0].packages).toEqual(["superpowers"]);
    expect(result.releases[0].release.tag).toBe("v5.1.0");
  });

  it("uses Compare API for monorepo plugins", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () =>
        Promise.resolve({
          commits: [
            {
              sha: "aaa111",
              commit: {
                message: "feat(figma): add new tool",
                author: { date: new Date().toISOString() },
              },
              html_url: "https://github.com/anthropics/claude-plugins-official/commit/aaa111",
            },
          ],
          files: [
            { filename: "plugins/figma/skills/figma/SKILL.md" },
          ],
          html_url: "https://github.com/anthropics/claude-plugins-official/compare/def456...HEAD",
        }),
    }) as any;

    const result = await fetchPluginUpdates([makeMonorepoPlugin()], 7);

    expect(result.releases).toHaveLength(1);
    expect(result.releases[0].release.url).toContain("/compare/def456...HEAD");
  });

  it("filters monorepo commits to only those touching the plugin path", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () =>
        Promise.resolve({
          commits: [
            {
              sha: "bbb222",
              commit: {
                message: "chore: update root readme",
                author: { date: new Date().toISOString() },
              },
              html_url: "https://github.com/anthropics/claude-plugins-official/commit/bbb222",
            },
          ],
          files: [
            { filename: "README.md" },
            { filename: "plugins/figma/package.json" },
          ],
          html_url: "https://github.com/anthropics/claude-plugins-official/compare/def456...HEAD",
        }),
    }) as any;

    const result = await fetchPluginUpdates([makeMonorepoPlugin()], 7);

    expect(result.releases).toHaveLength(1);
  });

  it("skips monorepo plugins with no relevant commits", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () =>
        Promise.resolve({
          commits: [
            {
              sha: "ccc333",
              commit: {
                message: "fix(superpowers): something else",
                author: { date: new Date().toISOString() },
              },
              html_url: "https://github.com/anthropics/claude-plugins-official/commit/ccc333",
            },
          ],
          files: [
            { filename: "plugins/superpowers/skills/SKILL.md" },
          ],
          html_url: "https://github.com/anthropics/claude-plugins-official/compare/def456...HEAD",
        }),
    }) as any;

    const result = await fetchPluginUpdates([makeMonorepoPlugin()], 7);

    expect(result.releases).toHaveLength(0);
  });

  it("falls back to date-scoped commits when Compare API returns 404", async () => {
    const now = new Date();
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () =>
          Promise.resolve([
            {
              sha: "ddd444",
              commit: {
                message: "feat(figma): new feature",
                author: { date: now.toISOString() },
              },
              html_url: "https://github.com/anthropics/claude-plugins-official/commit/ddd444",
            },
          ]),
      }) as any;

    const result = await fetchPluginUpdates([makeMonorepoPlugin()], 7);

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    const fallbackUrl = calls[1][0] as string;
    expect(fallbackUrl).toContain("/commits?");
    expect(fallbackUrl).toContain("path=plugins/figma");
  });

  it("falls back to commits for dedicated-repo with no releases", async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () =>
          Promise.resolve({
            commits: [
              {
                sha: "eee555",
                commit: {
                  message: "fix: patch something",
                  author: { date: new Date().toISOString() },
                },
                html_url: "https://github.com/obra/superpowers/commit/eee555",
              },
            ],
            files: [
              { filename: "src/index.ts" },
            ],
            html_url: "https://github.com/obra/superpowers/compare/abc123...HEAD",
          }),
      }) as any;

    const result = await fetchPluginUpdates([makeDedicatedPlugin()], 7);

    expect(result.releases).toHaveLength(1);
    expect(result.releases[0].release.tag).toBe("unreleased");
  });

  it("handles rate limiting", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ "x-ratelimit-remaining": "0" }),
    }) as any;

    const plugins = [makeDedicatedPlugin(), makeMonorepoPlugin()];
    const result = await fetchPluginUpdates(plugins, 7);

    expect(result.rateLimited).toBe(true);
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1);
  });

  it("handles network errors gracefully", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as any;

    const result = await fetchPluginUpdates([makeDedicatedPlugin()], 7);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("ECONNREFUSED");
    expect(result.releases).toHaveLength(0);
  });
});
