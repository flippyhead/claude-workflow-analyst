import { readFile } from "fs/promises";
import { discoverProjectDeps } from "../deps/project-discovery.js";
import { resolveToGithubRepos } from "../deps/npm-resolver.js";
import { fetchRecentReleases } from "../deps/github-releases.js";
import { fetchPluginUpdates } from "../deps/plugin-releases.js";
import {
  PluginInput,
  ReleaseEntry,
  PluginReleaseEntry,
  ScanDepsOutput,
  ScanDepsWithPluginsOutput,
} from "../deps/types.js";

interface ScanDepsCommandOptions {
  projectsBasePath: string;
  sinceDays: number;
  includeDev: boolean;
  pluginsPath?: string;
}

export async function scanDeps(
  options: ScanDepsCommandOptions
): Promise<ScanDepsOutput | ScanDepsWithPluginsOutput> {
  const allErrors: string[] = [];

  const discovery = await discoverProjectDeps(options.projectsBasePath, {
    includeDev: options.includeDev,
  });

  let depReleases: ReleaseEntry[] = [];
  let reposResolved = 0;
  let reposWithoutReleases = 0;
  let rateLimited = false;

  if (discovery.packages.size > 0) {
    const { repos, errors: resolveErrors } = await resolveToGithubRepos(
      discovery.packageDetails
    );
    allErrors.push(...resolveErrors);
    reposResolved = repos.length;

    const releaseResult = await fetchRecentReleases(repos, options.sinceDays);
    depReleases = releaseResult.releases;
    reposWithoutReleases = releaseResult.reposWithoutReleases;
    rateLimited = releaseResult.rateLimited;
    allErrors.push(...releaseResult.errors);
  }

  // Process plugins if provided
  let pluginReleases: PluginReleaseEntry[] = [];
  let pluginsScanned = 0;
  let pluginsWithUpdates = 0;

  if (options.pluginsPath) {
    try {
      const pluginsJson = await readFile(options.pluginsPath, "utf-8");
      const { plugins } = JSON.parse(pluginsJson) as { plugins: PluginInput[] };
      pluginsScanned = plugins.length;

      const pluginResult = await fetchPluginUpdates(plugins, options.sinceDays);
      pluginReleases = pluginResult.releases;
      pluginsWithUpdates = pluginResult.pluginsWithUpdates;
      if (pluginResult.rateLimited) rateLimited = true;
      allErrors.push(...pluginResult.errors);
    } catch (err) {
      allErrors.push(
        `Failed to process plugins file: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  const allReleases: (ReleaseEntry | PluginReleaseEntry)[] = [
    ...depReleases,
    ...pluginReleases,
  ];

  const baseOutput: ScanDepsOutput = {
    scannedAt: new Date().toISOString(),
    projectCount: discovery.projects.length,
    packageCount: discovery.packages.size,
    reposResolved,
    reposWithoutReleases,
    rateLimited,
    errors: allErrors,
    releases: allReleases,
  };

  if (options.pluginsPath) {
    return {
      ...baseOutput,
      pluginsScanned,
      pluginsWithUpdates,
    } as ScanDepsWithPluginsOutput;
  }

  return baseOutput;
}
