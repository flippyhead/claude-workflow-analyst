import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { discoverProjectDeps } from "../project-discovery.js";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("discoverProjectDeps", () => {
  let testDir: string;
  const dirsToClean: string[] = [];

  beforeEach(async () => {
    testDir = join(tmpdir(), `test-discovery-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    dirsToClean.push(testDir);
  });

  afterEach(async () => {
    for (const dir of dirsToClean) {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
    dirsToClean.length = 0;
  });

  it("discovers package.json deps from encoded project dirs", async () => {
    const projectDir = join(tmpdir(), "test-project-alpha");
    await mkdir(projectDir, { recursive: true });
    dirsToClean.push(projectDir);
    await writeFile(
      join(projectDir, "package.json"),
      JSON.stringify({
        dependencies: { convex: "^1.0.0", react: "^18.0.0" },
        devDependencies: { vitest: "^3.0.0" },
      })
    );

    const encoded = projectDir.replace(/\//g, "-");
    await mkdir(join(testDir, encoded), { recursive: true });

    const result = await discoverProjectDeps(testDir, { includeDev: false });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].path).toBe(projectDir);
    expect(result.packages.has("convex")).toBe(true);
    expect(result.packages.has("react")).toBe(true);
    expect(result.packages.has("vitest")).toBe(false);
  });

  it("includes devDependencies when includeDev is true", async () => {
    const projectDir = join(tmpdir(), "test-project-beta");
    await mkdir(projectDir, { recursive: true });
    dirsToClean.push(projectDir);
    await writeFile(
      join(projectDir, "package.json"),
      JSON.stringify({
        dependencies: { convex: "^1.0.0" },
        devDependencies: { vitest: "^3.0.0" },
      })
    );

    const encoded = projectDir.replace(/\//g, "-");
    await mkdir(join(testDir, encoded), { recursive: true });

    const result = await discoverProjectDeps(testDir, { includeDev: true });
    expect(result.packages.has("vitest")).toBe(true);
  });

  it("resolves workspace package.json files", async () => {
    const projectDir = join(tmpdir(), "test-project-mono");
    await mkdir(join(projectDir, "packages/web"), { recursive: true });
    dirsToClean.push(projectDir);
    await writeFile(
      join(projectDir, "package.json"),
      JSON.stringify({
        workspaces: ["packages/*"],
        dependencies: { typescript: "^5.0.0" },
      })
    );
    await writeFile(
      join(projectDir, "packages/web/package.json"),
      JSON.stringify({
        dependencies: { next: "^16.0.0", react: "^18.0.0" },
      })
    );

    const encoded = projectDir.replace(/\//g, "-");
    await mkdir(join(testDir, encoded), { recursive: true });

    const result = await discoverProjectDeps(testDir, { includeDev: false });
    expect(result.packages.has("typescript")).toBe(true);
    expect(result.packages.has("next")).toBe(true);
    expect(result.packages.has("react")).toBe(true);
  });

  it("skips encoded dirs that don't resolve to real paths", async () => {
    const encoded = "-nonexistent-fake-path-xyz";
    await mkdir(join(testDir, encoded), { recursive: true });

    const result = await discoverProjectDeps(testDir, { includeDev: false });
    expect(result.projects).toHaveLength(0);
    expect(result.packages.size).toBe(0);
  });

  it("deduplicates packages across projects and tracks usedBy", async () => {
    const projectA = join(tmpdir(), "test-dedup-a");
    const projectB = join(tmpdir(), "test-dedup-b");
    await mkdir(projectA, { recursive: true });
    await mkdir(projectB, { recursive: true });
    dirsToClean.push(projectA, projectB);
    await writeFile(
      join(projectA, "package.json"),
      JSON.stringify({ dependencies: { react: "^18.0.0", zod: "^3.0.0" } })
    );
    await writeFile(
      join(projectB, "package.json"),
      JSON.stringify({ dependencies: { react: "^19.0.0", convex: "^1.0.0" } })
    );

    const encodedA = projectA.replace(/\//g, "-");
    const encodedB = projectB.replace(/\//g, "-");
    await mkdir(join(testDir, encodedA), { recursive: true });
    await mkdir(join(testDir, encodedB), { recursive: true });

    const result = await discoverProjectDeps(testDir, { includeDev: false });
    expect(result.packages.size).toBe(3);
    const reactInfo = result.packageDetails.get("react");
    expect(reactInfo?.usedBy).toContain(projectA);
    expect(reactInfo?.usedBy).toContain(projectB);
  });
});
