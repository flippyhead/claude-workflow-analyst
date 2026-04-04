import { PackageInfo, ResolvedRepo } from "./types.js";
export declare function parseGitHubRepo(repoUrl: string): string | null;
interface ResolveResult {
    repos: ResolvedRepo[];
    errors: string[];
}
export declare function resolveToGithubRepos(packageDetails: Map<string, PackageInfo>): Promise<ResolveResult>;
export {};
//# sourceMappingURL=npm-resolver.d.ts.map