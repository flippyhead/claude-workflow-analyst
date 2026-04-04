import { PluginInput, PluginReleaseEntry } from "./types.js";

interface FetchPluginUpdatesResult {
  releases: PluginReleaseEntry[];
  pluginsWithUpdates: number;
  rateLimited: boolean;
  errors: string[];
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

function isRateLimited(response: Response): boolean {
  if (response.status === 429) return true;
  if (response.status === 403) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    return remaining === "0";
  }
  return false;
}

interface CompareCommit {
  sha: string;
  commit: {
    message: string;
    author: { date: string };
  };
  html_url: string;
}

interface CompareResponse {
  commits: CompareCommit[];
  files: { filename: string }[];
  html_url: string;
}

function processCompareResponse(
  data: CompareResponse,
  plugin: PluginInput
): PluginReleaseEntry | null {
  // For monorepo plugins, filter files to only those under the plugin path
  if (plugin.repoPath) {
    const relevantFiles = data.files.filter((f) =>
      f.filename.startsWith(plugin.repoPath!)
    );
    if (relevantFiles.length === 0) return null;
  }

  if (data.commits.length === 0) return null;

  const commitSummary = data.commits
    .map((c) => c.commit.message.split("\n")[0])
    .join("\n");

  return {
    sourceType: "plugin",
    installedVersion: plugin.installedVersion,
    packages: [plugin.name],
    repo: plugin.repo,
    repoDescription: `Plugin: ${plugin.name} (${plugin.marketplace})`,
    release: {
      tag: "unreleased",
      name: `Unreleased changes (${data.commits.length} commit${data.commits.length === 1 ? "" : "s"})`,
      publishedAt: data.commits[0].commit.author.date,
      body: commitSummary,
      url: data.html_url,
    },
    usedBy: [],
  };
}

async function fetchCompareCommits(
  plugin: PluginInput,
  sinceDays: number,
  headers: Record<string, string>
): Promise<{ entry: PluginReleaseEntry | null; rateLimited: boolean; error?: string }> {
  // Try Compare API first
  const compareUrl = `https://api.github.com/repos/${plugin.repo}/compare/${plugin.gitCommitSha}...HEAD`;
  const compareResponse = await fetch(compareUrl, { headers });

  if (isRateLimited(compareResponse)) {
    return { entry: null, rateLimited: true };
  }

  if (compareResponse.ok) {
    const data = (await compareResponse.json()) as CompareResponse;
    const entry = processCompareResponse(data, plugin);
    return { entry, rateLimited: false };
  }

  if (compareResponse.status === 404) {
    // Fall back to date-scoped commits
    return fetchDateScopedCommits(plugin, sinceDays, headers);
  }

  return {
    entry: null,
    rateLimited: false,
    error: `GitHub ${compareResponse.status} for ${plugin.repo} compare`,
  };
}

async function fetchDateScopedCommits(
  plugin: PluginInput,
  sinceDays: number,
  headers: Record<string, string>
): Promise<{ entry: PluginReleaseEntry | null; rateLimited: boolean; error?: string }> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - sinceDays);

  let url = `https://api.github.com/repos/${plugin.repo}/commits?since=${sinceDate.toISOString()}&per_page=30`;
  if (plugin.repoPath) {
    url += `&path=${plugin.repoPath}`;
  }

  const response = await fetch(url, { headers });

  if (isRateLimited(response)) {
    return { entry: null, rateLimited: true };
  }

  if (!response.ok) {
    return {
      entry: null,
      rateLimited: false,
      error: `GitHub ${response.status} for ${plugin.repo} commits`,
    };
  }

  const commits = (await response.json()) as CompareCommit[];
  if (!Array.isArray(commits) || commits.length === 0) {
    return { entry: null, rateLimited: false };
  }

  const commitSummary = commits
    .map((c) => c.commit.message.split("\n")[0])
    .join("\n");

  const entry: PluginReleaseEntry = {
    sourceType: "plugin",
    installedVersion: plugin.installedVersion,
    packages: [plugin.name],
    repo: plugin.repo,
    repoDescription: `Plugin: ${plugin.name} (${plugin.marketplace})`,
    release: {
      tag: "unreleased",
      name: `Unreleased changes (${commits.length} commit${commits.length === 1 ? "" : "s"})`,
      publishedAt: commits[0].commit.author.date,
      body: commitSummary,
      url: commits[0].html_url,
    },
    usedBy: [],
  };

  return { entry, rateLimited: false };
}

async function fetchDedicatedRepoUpdates(
  plugin: PluginInput,
  sinceDays: number,
  headers: Record<string, string>
): Promise<{ entries: PluginReleaseEntry[]; rateLimited: boolean; error?: string }> {
  // Try releases API first
  const releasesUrl = `https://api.github.com/repos/${plugin.repo}/releases?per_page=10`;
  const response = await fetch(releasesUrl, { headers });

  if (isRateLimited(response)) {
    return { entries: [], rateLimited: true };
  }

  if (!response.ok) {
    // Non-rate-limit error on releases, try compare
    const compareResult = await fetchCompareCommits(plugin, sinceDays, headers);
    return {
      entries: compareResult.entry ? [compareResult.entry] : [],
      rateLimited: compareResult.rateLimited,
      error: compareResult.error,
    };
  }

  const ghReleases = await response.json();

  if (!Array.isArray(ghReleases) || ghReleases.length === 0) {
    // No releases, fall back to compare
    const compareResult = await fetchCompareCommits(plugin, sinceDays, headers);
    return {
      entries: compareResult.entry ? [compareResult.entry] : [],
      rateLimited: compareResult.rateLimited,
      error: compareResult.error,
    };
  }

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - sinceDays);

  const entries: PluginReleaseEntry[] = [];
  for (const ghRelease of ghReleases) {
    const publishedAt = new Date(ghRelease.published_at);
    if (publishedAt < sinceDate) continue;

    entries.push({
      sourceType: "plugin",
      installedVersion: plugin.installedVersion,
      packages: [plugin.name],
      repo: plugin.repo,
      repoDescription: `Plugin: ${plugin.name} (${plugin.marketplace})`,
      release: {
        tag: ghRelease.tag_name,
        name: ghRelease.name || ghRelease.tag_name,
        publishedAt: ghRelease.published_at,
        body: ghRelease.body || "",
        url: ghRelease.html_url,
      },
      usedBy: [],
    });
  }

  return { entries, rateLimited: false };
}

async function fetchMonorepoUpdates(
  plugin: PluginInput,
  sinceDays: number,
  headers: Record<string, string>
): Promise<{ entries: PluginReleaseEntry[]; rateLimited: boolean; error?: string }> {
  const result = await fetchCompareCommits(plugin, sinceDays, headers);
  return {
    entries: result.entry ? [result.entry] : [],
    rateLimited: result.rateLimited,
    error: result.error,
  };
}

export async function fetchPluginUpdates(
  plugins: PluginInput[],
  sinceDays: number
): Promise<FetchPluginUpdatesResult> {
  const releases: PluginReleaseEntry[] = [];
  const errors: string[] = [];
  let rateLimited = false;

  const headers = getHeaders();

  for (const plugin of plugins) {
    if (rateLimited) break;

    try {
      const isMonorepo = plugin.repoPath !== null;
      const result = isMonorepo
        ? await fetchMonorepoUpdates(plugin, sinceDays, headers)
        : await fetchDedicatedRepoUpdates(plugin, sinceDays, headers);

      if (result.rateLimited) {
        rateLimited = true;
        errors.push(
          `GitHub rate limit hit while checking plugin ${plugin.name}. ` +
            `${plugins.indexOf(plugin)} of ${plugins.length} plugins processed.`
        );
        break;
      }

      if (result.error) {
        errors.push(result.error);
      }

      releases.push(...result.entries);
    } catch (err) {
      errors.push(
        `Failed to fetch updates for plugin ${plugin.name}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  const pluginsWithUpdates = new Set(releases.map((r) => r.repo)).size;

  return { releases, pluginsWithUpdates, rateLimited, errors };
}
