import { describe, it, expect, vi, afterEach } from "vitest";
import { parseGitHubRepo, resolveToGithubRepos } from "../npm-resolver.js";

describe("parseGitHubRepo", () => {
  it("parses git+https URL", () => {
    expect(parseGitHubRepo("git+https://github.com/vercel/next.js.git")).toBe("vercel/next.js");
  });

  it("parses plain https URL", () => {
    expect(parseGitHubRepo("https://github.com/colinhacks/zod")).toBe("colinhacks/zod");
  });

  it("parses github: shorthand", () => {
    expect(parseGitHubRepo("github:jrswab/axe")).toBe("jrswab/axe");
  });

  it("parses git:// URL", () => {
    expect(parseGitHubRepo("git://github.com/lodash/lodash.git")).toBe("lodash/lodash");
  });

  it("parses ssh URL", () => {
    expect(parseGitHubRepo("ssh://git@github.com/owner/repo.git")).toBe("owner/repo");
  });

  it("parses bare owner/repo shorthand", () => {
    expect(parseGitHubRepo("owner/repo")).toBe("owner/repo");
  });

  it("returns null for non-GitHub URLs", () => {
    expect(parseGitHubRepo("https://gitlab.com/owner/repo")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseGitHubRepo("")).toBeNull();
  });

  it("strips trailing .git", () => {
    expect(parseGitHubRepo("https://github.com/owner/repo.git")).toBe("owner/repo");
  });
});

describe("resolveToGithubRepos", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("resolves packages to GitHub repos via npm registry", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        repository: { type: "git", url: "git+https://github.com/get-convex/convex-backend.git" },
        description: "The open-source reactive database",
      }),
    }) as any;

    const packageDetails = new Map([
      ["convex", { name: "convex", usedBy: ["/path/a"], isDev: false }],
    ]);

    const result = await resolveToGithubRepos(packageDetails);
    expect(result.repos).toHaveLength(1);
    expect(result.repos[0].repo).toBe("get-convex/convex-backend");
    expect(result.repos[0].packages).toContain("convex");
  });

  it("deduplicates packages that share a repo (monorepo)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        repository: { type: "git", url: "git+https://github.com/babel/babel.git" },
        description: "Babel compiler",
      }),
    }) as any;

    const packageDetails = new Map([
      ["@babel/core", { name: "@babel/core", usedBy: ["/path/a"], isDev: false }],
      ["@babel/parser", { name: "@babel/parser", usedBy: ["/path/a"], isDev: false }],
    ]);

    const result = await resolveToGithubRepos(packageDetails);
    expect(result.repos).toHaveLength(1);
    expect(result.repos[0].packages).toContain("@babel/core");
    expect(result.repos[0].packages).toContain("@babel/parser");
  });

  it("skips packages with no GitHub repo", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ repository: undefined }),
    }) as any;

    const packageDetails = new Map([
      ["no-repo-pkg", { name: "no-repo-pkg", usedBy: ["/path/a"], isDev: false }],
    ]);

    const result = await resolveToGithubRepos(packageDetails);
    expect(result.repos).toHaveLength(0);
  });

  it("handles npm network errors gracefully", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as any;

    const packageDetails = new Map([
      ["broken-pkg", { name: "broken-pkg", usedBy: ["/path/a"], isDev: false }],
    ]);

    const result = await resolveToGithubRepos(packageDetails);
    expect(result.repos).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("ECONNREFUSED");
  });

  it("handles repository field as string shorthand", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        repository: "github:owner/my-repo",
        description: "A repo",
      }),
    }) as any;

    const packageDetails = new Map([
      ["string-repo", { name: "string-repo", usedBy: ["/path/a"], isDev: false }],
    ]);

    const result = await resolveToGithubRepos(packageDetails);
    expect(result.repos).toHaveLength(1);
    expect(result.repos[0].repo).toBe("owner/my-repo");
  });

  it("handles npm 404 gracefully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as any;

    const packageDetails = new Map([
      ["private-pkg", { name: "private-pkg", usedBy: ["/path/a"], isDev: false }],
    ]);

    const result = await resolveToGithubRepos(packageDetails);
    expect(result.repos).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });
});
