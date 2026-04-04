import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchRecentReleases } from "../github-releases.js";
import { ResolvedRepo } from "../types.js";

describe("fetchRecentReleases", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  });

  const makeRepo = (repo: string): ResolvedRepo => ({
    repo,
    repoDescription: "test repo",
    packages: ["test-pkg"],
    usedBy: ["/path/a"],
  });

  it("fetches releases within the since window", async () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: () => Promise.resolve([
        {
          tag_name: "v1.2.0",
          name: "Release 1.2.0",
          published_at: twoDaysAgo.toISOString(),
          body: "New features",
          html_url: "https://github.com/owner/repo/releases/tag/v1.2.0",
        },
        {
          tag_name: "v1.1.0",
          name: "Release 1.1.0",
          published_at: tenDaysAgo.toISOString(),
          body: "Old release",
          html_url: "https://github.com/owner/repo/releases/tag/v1.1.0",
        },
      ]),
    }) as any;

    const result = await fetchRecentReleases([makeRepo("owner/repo")], 7);
    expect(result.releases).toHaveLength(1);
    expect(result.releases[0].release.tag).toBe("v1.2.0");
  });

  it("uses GITHUB_TOKEN when available", async () => {
    process.env.GITHUB_TOKEN = "test-token";

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: () => Promise.resolve([]),
    }) as any;

    await fetchRecentReleases([makeRepo("owner/repo")], 7);

    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("handles rate limiting gracefully (403)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ "x-ratelimit-remaining": "0" }),
    }) as any;

    const repos = [makeRepo("owner/repo1"), makeRepo("owner/repo2")];
    const result = await fetchRecentReleases(repos, 7);
    expect(result.rateLimited).toBe(true);
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1);
  });

  it("handles 429 rate limiting", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers(),
    }) as any;

    const repos = [makeRepo("owner/repo1"), makeRepo("owner/repo2")];
    const result = await fetchRecentReleases(repos, 7);
    expect(result.rateLimited).toBe(true);
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1);
  });

  it("handles network errors gracefully", async () => {
    globalThis.fetch = vi.fn()
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: () => Promise.resolve([]),
      }) as any;

    const repos = [makeRepo("owner/repo1"), makeRepo("owner/repo2")];
    const result = await fetchRecentReleases(repos, 7);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("ECONNREFUSED");
  });

  it("skips repos with 404 errors and continues", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: false, status: 404, headers: new Headers() });
      }
      return Promise.resolve({
        ok: true,
        headers: new Headers(),
        json: () => Promise.resolve([{
          tag_name: "v2.0.0",
          name: "Release 2.0.0",
          published_at: new Date().toISOString(),
          body: "Latest",
          html_url: "https://github.com/owner/repo2/releases/tag/v2.0.0",
        }]),
      });
    }) as any;

    const repos = [makeRepo("owner/repo1"), makeRepo("owner/repo2")];
    const result = await fetchRecentReleases(repos, 7);
    expect(result.releases).toHaveLength(1);
    expect(result.releases[0].repo).toBe("owner/repo2");
    expect(result.errors).toHaveLength(1);
  });

  it("returns empty for repos with no releases", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: () => Promise.resolve([]),
    }) as any;

    const result = await fetchRecentReleases([makeRepo("owner/repo")], 7);
    expect(result.releases).toHaveLength(0);
    expect(result.reposWithoutReleases).toBe(1);
  });
});
