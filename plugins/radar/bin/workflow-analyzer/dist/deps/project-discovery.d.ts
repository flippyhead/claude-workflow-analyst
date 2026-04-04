import { DiscoveredProject, PackageInfo } from "./types.js";
interface DiscoveryOptions {
    includeDev: boolean;
}
interface DiscoveryResult {
    projects: DiscoveredProject[];
    packages: Set<string>;
    packageDetails: Map<string, PackageInfo>;
}
/**
 * Decode an encoded project directory name to its full filesystem path.
 * The encoding replaces "/" with "-", but "-" also appears literally in
 * directory names (e.g., "ai-brain").
 *
 * Strategy: split on "-" to get segments, then walk from root trying
 * progressively longer hyphenated names to find real directories on disk.
 */
export declare function decodeToFullPath(encoded: string): Promise<string | null>;
export declare function discoverProjectDeps(projectsBasePath: string, options: DiscoveryOptions): Promise<DiscoveryResult>;
export {};
//# sourceMappingURL=project-discovery.d.ts.map