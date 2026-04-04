export function parseGitHubRepo(repoUrl) {
    if (!repoUrl)
        return null;
    let url = repoUrl.trim();
    // Handle "github:owner/repo" shorthand
    if (url.startsWith("github:")) {
        return url.slice("github:".length).replace(/\.git$/, "");
    }
    // Handle bare "owner/repo" shorthand (no protocol, single slash, no colon)
    if (/^[^/:@]+\/[^/:@]+$/.test(url)) {
        return url.replace(/\.git$/, "");
    }
    // Handle various URL formats — extract from github.com path
    const githubMatch = url.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?(?:\/.*)?$/);
    if (githubMatch) {
        return githubMatch[1];
    }
    return null;
}
export async function resolveToGithubRepos(packageDetails) {
    const repoMap = new Map();
    const errors = [];
    for (const [pkgName, pkgInfo] of packageDetails) {
        try {
            const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkgName)}`);
            if (!response.ok) {
                errors.push(`npm registry ${response.status} for ${pkgName}`);
                continue;
            }
            const data = await response.json();
            let repoUrl = null;
            if (typeof data.repository === "string") {
                repoUrl = data.repository;
            }
            else if (data.repository?.url) {
                repoUrl = data.repository.url;
            }
            const ghRepo = repoUrl ? parseGitHubRepo(repoUrl) : null;
            if (!ghRepo)
                continue;
            const description = data.description || "";
            const existing = repoMap.get(ghRepo);
            if (existing) {
                if (!existing.packages.includes(pkgName))
                    existing.packages.push(pkgName);
                for (const usedBy of pkgInfo.usedBy) {
                    if (!existing.usedBy.includes(usedBy))
                        existing.usedBy.push(usedBy);
                }
            }
            else {
                repoMap.set(ghRepo, {
                    repo: ghRepo,
                    repoDescription: description,
                    packages: [pkgName],
                    usedBy: [...pkgInfo.usedBy],
                });
            }
        }
        catch (err) {
            errors.push(`Failed to resolve ${pkgName}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    return { repos: Array.from(repoMap.values()), errors };
}
//# sourceMappingURL=npm-resolver.js.map