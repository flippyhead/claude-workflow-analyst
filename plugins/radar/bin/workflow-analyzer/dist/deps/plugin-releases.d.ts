import { PluginInput, PluginReleaseEntry } from "./types.js";
interface FetchPluginUpdatesResult {
    releases: PluginReleaseEntry[];
    pluginsWithUpdates: number;
    rateLimited: boolean;
    errors: string[];
}
export declare function fetchPluginUpdates(plugins: PluginInput[], sinceDays: number): Promise<FetchPluginUpdatesResult>;
export {};
//# sourceMappingURL=plugin-releases.d.ts.map