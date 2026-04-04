import { describe, it, expect, vi, afterEach } from "vitest";
import { scanDeps } from "../scan-deps.js";

describe("scanDeps", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("produces valid output structure with empty projects dir", async () => {
    const result = await scanDeps({
      projectsBasePath: "/tmp/nonexistent-dir",
      sinceDays: 7,
      includeDev: false,
    });

    expect(result.scannedAt).toBeDefined();
    expect(result.projectCount).toBe(0);
    expect(result.packageCount).toBe(0);
    expect(result.reposResolved).toBe(0);
    expect(result.releases).toEqual([]);
    expect(result.rateLimited).toBe(false);
    expect(result.errors).toEqual([]);
  });

  it("includes plugin releases when pluginsPath is provided", async () => {
    const { writeFile, mkdtemp, rm } = await import("fs/promises");
    const { join } = await import("path");
    const { tmpdir } = await import("os");

    const tmpDir = await mkdtemp(join(tmpdir(), "scan-deps-test-"));

    const pluginsJson = JSON.stringify({
      plugins: [
        {
          name: "test-plugin",
          marketplace: "test-marketplace",
          repo: "owner/test-plugin",
          repoPath: null,
          installedVersion: "1.0.0",
          gitCommitSha: "abc123",
        },
      ],
    });

    const pluginsPath = join(tmpDir, "plugins.json");
    await writeFile(pluginsPath, pluginsJson);

    const originalFetch = globalThis.fetch;
    const now = new Date();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: () =>
        Promise.resolve([
          {
            tag_name: "v1.1.0",
            name: "v1.1.0",
            published_at: now.toISOString(),
            body: "New feature",
            html_url: "https://github.com/owner/test-plugin/releases/tag/v1.1.0",
          },
        ]),
    }) as any;

    try {
      const result = await scanDeps({
        projectsBasePath: tmpDir,
        sinceDays: 7,
        includeDev: false,
        pluginsPath,
      });

      expect(result.releases).toHaveLength(1);
      expect((result.releases[0] as any).sourceType).toBe("plugin");
      expect((result as any).pluginsScanned).toBe(1);
      expect((result as any).pluginsWithUpdates).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
      await rm(tmpDir, { recursive: true });
    }
  });
});
