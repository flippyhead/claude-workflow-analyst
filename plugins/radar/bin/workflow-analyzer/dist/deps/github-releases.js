export async function fetchRecentReleases(repos, sinceDays) {
    const releases = [];
    const errors = [];
    let reposWithoutReleases = 0;
    let rateLimited = false;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - sinceDays);
    const headers = {
        Accept: "application/vnd.github+json",
    };
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    for (const resolvedRepo of repos) {
        if (rateLimited)
            break;
        try {
            const response = await fetch(`https://api.github.com/repos/${resolvedRepo.repo}/releases?per_page=10`, { headers });
            if (!response.ok) {
                if (response.status === 403 || response.status === 429) {
                    const remaining = response.headers.get("x-ratelimit-remaining");
                    if (remaining === "0" || response.status === 429) {
                        rateLimited = true;
                        errors.push(`GitHub rate limit hit after ${releases.length} releases fetched. ` +
                            `${repos.indexOf(resolvedRepo)} of ${repos.length} repos processed.`);
                        break;
                    }
                }
                errors.push(`GitHub ${response.status} for ${resolvedRepo.repo}`);
                continue;
            }
            const ghReleases = await response.json();
            if (!Array.isArray(ghReleases) || ghReleases.length === 0) {
                reposWithoutReleases++;
                continue;
            }
            let hasRecentRelease = false;
            for (const ghRelease of ghReleases) {
                const publishedAt = new Date(ghRelease.published_at);
                if (publishedAt < sinceDate)
                    continue;
                hasRecentRelease = true;
                releases.push({
                    packages: [...resolvedRepo.packages],
                    repo: resolvedRepo.repo,
                    repoDescription: resolvedRepo.repoDescription,
                    release: {
                        tag: ghRelease.tag_name,
                        name: ghRelease.name || ghRelease.tag_name,
                        publishedAt: ghRelease.published_at,
                        body: ghRelease.body || "",
                        url: ghRelease.html_url,
                    },
                    usedBy: [...resolvedRepo.usedBy],
                });
            }
            if (!hasRecentRelease)
                reposWithoutReleases++;
        }
        catch (err) {
            errors.push(`Failed to fetch releases for ${resolvedRepo.repo}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    return { releases, reposWithoutReleases, rateLimited, errors };
}
//# sourceMappingURL=github-releases.js.map