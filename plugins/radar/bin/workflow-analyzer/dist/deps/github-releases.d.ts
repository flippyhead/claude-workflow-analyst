import { ResolvedRepo, ReleaseEntry } from "./types.js";
interface FetchReleasesResult {
    releases: ReleaseEntry[];
    reposWithoutReleases: number;
    rateLimited: boolean;
    errors: string[];
}
export declare function fetchRecentReleases(repos: ResolvedRepo[], sinceDays: number): Promise<FetchReleasesResult>;
export {};
//# sourceMappingURL=github-releases.d.ts.map