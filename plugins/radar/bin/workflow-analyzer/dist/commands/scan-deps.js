import { readFile } from "fs/promises";
import { discoverProjectDeps } from "../deps/project-discovery.js";
import { resolveToGithubRepos } from "../deps/npm-resolver.js";
import { fetchRecentReleases } from "../deps/github-releases.js";
import { fetchPluginUpdates } from "../deps/plugin-releases.js";
export async function scanDeps(options) {
    const allErrors = [];
    const discovery = await discoverProjectDeps(options.projectsBasePath, {
        includeDev: options.includeDev,
    });
    let depReleases = [];
    let reposResolved = 0;
    let reposWithoutReleases = 0;
    let rateLimited = false;
    if (discovery.packages.size > 0) {
        const { repos, errors: resolveErrors } = await resolveToGithubRepos(discovery.packageDetails);
        allErrors.push(...resolveErrors);
        reposResolved = repos.length;
        const releaseResult = await fetchRecentReleases(repos, options.sinceDays);
        depReleases = releaseResult.releases;
        reposWithoutReleases = releaseResult.reposWithoutReleases;
        rateLimited = releaseResult.rateLimited;
        allErrors.push(...releaseResult.errors);
    }
    // Process plugins if provided
    let pluginReleases = [];
    let pluginsScanned = 0;
    let pluginsWithUpdates = 0;
    if (options.pluginsPath) {
        try {
            const pluginsJson = await readFile(options.pluginsPath, "utf-8");
            const { plugins } = JSON.parse(pluginsJson);
            pluginsScanned = plugins.length;
            const pluginResult = await fetchPluginUpdates(plugins, options.sinceDays);
            pluginReleases = pluginResult.releases;
            pluginsWithUpdates = pluginResult.pluginsWithUpdates;
            if (pluginResult.rateLimited)
                rateLimited = true;
            allErrors.push(...pluginResult.errors);
        }
        catch (err) {
            allErrors.push(`Failed to process plugins file: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    const allReleases = [
        ...depReleases,
        ...pluginReleases,
    ];
    const baseOutput = {
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
        };
    }
    return baseOutput;
}
//# sourceMappingURL=scan-deps.js.map