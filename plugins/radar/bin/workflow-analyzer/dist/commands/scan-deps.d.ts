import { ScanDepsOutput, ScanDepsWithPluginsOutput } from "../deps/types.js";
interface ScanDepsCommandOptions {
    projectsBasePath: string;
    sinceDays: number;
    includeDev: boolean;
    pluginsPath?: string;
}
export declare function scanDeps(options: ScanDepsCommandOptions): Promise<ScanDepsOutput | ScanDepsWithPluginsOutput>;
export {};
//# sourceMappingURL=scan-deps.d.ts.map